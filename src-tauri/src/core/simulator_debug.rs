use ethers::providers::{Provider, Http, Middleware};
use ethers::types::{TransactionRequest, GethDebugTracingOptions, GethTrace, transaction::eip2718::TypedTransaction, TxHash};
use ethers::utils::Anvil;
use serde_json::{json, Value};
use std::sync::Arc;
use std::path::PathBuf;
use std::env;
use crate::types::SimulatorDebugInfo;
use super::trace_formatter::{format_tenderly_style, format_trace_for_display};


/// Get the path to binaries
fn get_binary_path(binary_name: &str) -> PathBuf {
    let current_dir = env::current_dir().unwrap_or_default();
    
    // Try current directory first
    let mut binaries_path = current_dir.join("binaries");
    
    // If not found, try going up two levels (from rust-migration/raliet to root)
    if !binaries_path.exists() {
        binaries_path = current_dir.join("../../binaries");
    }
    
    let is_windows = cfg!(target_os = "windows");
    let name = if is_windows { 
        format!("{}.exe", binary_name)
    } else { 
        binary_name.to_string()
    };
    let binary_path = binaries_path.join(name);
    
    println!("[BINARY] Looking for {} at: {:?}", binary_name, binary_path);
    println!("[BINARY] Exists: {}", binary_path.exists());
    
    binary_path
}

/// Get the path to anvil binary
fn get_anvil_path() -> PathBuf {
    get_binary_path("anvil")
}

/// Get the path to cast binary
fn get_cast_path() -> PathBuf {
    get_binary_path("cast")
}





pub async fn simulate_transaction(tx: TransactionRequest, rpc_url: String, block: u64) -> anyhow::Result<SimulatorDebugInfo> {

    let anvil_path = get_anvil_path();
    
    let anvil = Anvil::new()
        .path(anvil_path)
        .fork(rpc_url.as_str())
        .fork_block_number(block)
        .spawn();

    let provider = Arc::new(Provider::<Http>::try_from(anvil.endpoint())?);

    let pending_tx = provider.send_transaction(tx.clone(), None).await?;
    let tx_hash = pending_tx.tx_hash();

    let trace_options = GethDebugTracingOptions::default();
    let geth_trace: GethTrace = provider.debug_trace_transaction(tx_hash, trace_options).await?;
    let trace: Value = serde_json::to_value(geth_trace)?;

    let typed_tx: TypedTransaction = tx.clone().into();
    let call_result = match provider.call(&typed_tx, None).await {
        Ok(res) => Ok(res.to_vec()),
        Err(err) => Err(err.to_string()),
    };

    Ok(SimulatorDebugInfo {
        from: tx.from.unwrap_or_default(),
        to: tx.to.and_then(|name_or_addr| match name_or_addr {
            ethers::types::NameOrAddress::Address(addr) => Some(addr),
            _ => None,
        }),
        value: tx.value.unwrap_or_default(),
        gas_estimate: provider.estimate_gas(&typed_tx, None).await?,
        call_result: call_result,
        trace,
    })
}


pub async fn trace_transaction(
    tx_hash: TxHash,
    rpc_url: &str,
    block: u64,
) -> anyhow::Result<Value> {
    println!("Tracing transaction: {:?} at block {} using RPC: {}", tx_hash, block, rpc_url);

    let anvil_path = get_anvil_path();
    
    // Start Anvil with full tracing enabled
    let anvil = Anvil::new()
        .path(anvil_path)
        .fork(rpc_url)
        .fork_block_number(block)
        .args(vec!["--steps-tracing", "--code-size-limit", "41943040"])
        .spawn();

    println!("Anvil node started at: {}", anvil.endpoint());

    let provider = Arc::new(Provider::<Http>::try_from(anvil.endpoint())?);

    // Get the transaction receipt and details
    println!("Fetching transaction receipt...");
    let tx_receipt = provider.get_transaction_receipt(tx_hash).await?
        .ok_or_else(|| anyhow::anyhow!("Transaction not found"))?;
    
    let tx_details = provider.get_transaction(tx_hash).await?
        .ok_or_else(|| anyhow::anyhow!("Transaction details not found"))?;

    // Format trace in Tenderly style
    let cast_trace = match get_cast_trace_quick(tx_hash, &tx_details, &anvil.endpoint().to_string()).await {
        Ok(trace_output) => {
            let cast_stdout = trace_output.get("stdout")
                .and_then(|s| s.as_str())
                .unwrap_or("");
            Some(cast_stdout.to_string())
        },
        Err(e) => {
            println!("Cast trace failed: {}", e);
            None
        }
    };

    let trace = format_tenderly_style(&tx_details, &tx_receipt, cast_trace.as_deref());
    
    // Print formatted trace to console
    let display = format_trace_for_display(&trace);
    println!("{}", display);

    Ok(trace)
}

/// Get cast trace quickly by simulating the call on the forked Anvil
async fn get_cast_trace_quick(tx_hash: TxHash, tx_details: &ethers::types::Transaction, rpc_url: &str) -> anyhow::Result<Value> {
    use tokio::process::Command as TokioCommand;
    use tokio::time::{timeout, Duration};
    
    let cast_path = get_cast_path();
    
    if !cast_path.exists() {
        return Err(anyhow::anyhow!("Cast binary not found"));
    }
    
    // Use cast call with --trace to simulate the transaction on the forked state
    // This is fast because Anvil already has the state at the block
    let from_address = format!("{:?}", tx_details.from);
    let to_address = tx_details.to
        .map(|addr| format!("{:?}", addr))
        .unwrap_or_else(|| "".to_string());
    
    let input_data = format!("0x{}", hex::encode(&tx_details.input));
    let value = format!("{}", tx_details.value);
    
    println!("Executing cast call with --trace on forked Anvil...");
    println!("From: {}, To: {}, Value: {}", from_address, to_address, value);
    
    let mut cmd = TokioCommand::new(&cast_path);
    cmd.arg("call")
        .arg(&to_address)
        .arg(&input_data)
        .arg("--from")
        .arg(&from_address)
        .arg("--value")
        .arg(&value)
        .arg("--trace")
        .arg("--rpc-url")
        .arg(rpc_url);
    
    let output_result = timeout(
        Duration::from_secs(30),
        cmd.output()
    ).await;
    
    let output = match output_result {
        Ok(Ok(output)) => output,
        Ok(Err(e)) => {
            println!("Cast execution failed: {}", e);
            return Err(anyhow::anyhow!("Failed to execute cast: {}", e));
        }
        Err(_) => {
            println!("Cast execution timed out");
            return Err(anyhow::anyhow!("Cast execution timed out"));
        }
    };
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    
    println!("\n========== CAST TRACE OUTPUT ==========");
    println!("{}", stdout);
    if !stderr.is_empty() {
        println!("STDERR: {}", stderr);
    }
    println!("=======================================\n");
    
    Ok(json!({
        "stdout": stdout.to_string(),
        "stderr": stderr.to_string(),
        "success": output.status.success(),
    }))
}
