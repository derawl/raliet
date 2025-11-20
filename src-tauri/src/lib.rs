// Modules
pub mod types;
pub mod core;
use crate::core::simulator_debug::trace_transaction;
use ethers::types::TxHash;


// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    println!("Greet called with name: {}", name);
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[tauri::command]
fn path() -> String {
    let simulator = core::TransactionSimulator::initialize();
    let path = simulator.get_binaries_paths();
    let located = simulator.locate_binaries().unwrap_or(("Not found".to_string(), "Not found".to_string()));
    format!("Binaries path: {:?}, Located: {:?}", path, located)
}

#[tauri::command]
async fn debug_transaction(
    tx_hash: String,
    rpc_url: String,
    block: u64,
) -> Result<String, String> {
    println!("Debug transaction called with tx_hash: {}, rpc_url: {}, block: {}", tx_hash, rpc_url, block);
    
    // Parse the hex string to TxHash
    let tx: TxHash = tx_hash.parse()
        .map_err(|e| format!("Invalid transaction hash: {}", e))?;
    
    let result = trace_transaction(tx, &rpc_url, block).await;
    match result {
        Ok(trace) => {
            println!("Successfully traced transaction");
            Ok(format!("{}", serde_json::to_string_pretty(&trace).unwrap_or_else(|_| format!("{:?}", trace))))
        },
        Err(e) => {
            println!("Error tracing transaction: {:?}", e);
            Err(format!("Error tracing transaction: {:?}", e))
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, add, path, debug_transaction])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
