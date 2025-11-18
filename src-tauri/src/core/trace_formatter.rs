use serde_json::{json, Value};
use ethers::types::{Transaction, TransactionReceipt};

/// Format trace data in a Tenderly-style readable format
pub fn format_tenderly_style(
    tx: &Transaction,
    receipt: &TransactionReceipt,
    cast_output: Option<&str>,
) -> Value {
    // Parse function signature from input data
    let function_sig = if tx.input.len() >= 4 {
        format!("0x{}", hex::encode(&tx.input[..4]))
    } else {
        "0x".to_string()
    };

    // Format the main transaction info
    let mut trace = json!({
        "overview": {
            "status": if receipt.status == Some(1.into()) { "✓ Success" } else { "✗ Failed" },
            "transactionHash": format!("{:?}", tx.hash),
            "block": receipt.block_number,
            "timestamp": receipt.block_number, // You can fetch actual timestamp if needed
        },
        "transactionInfo": {
            "from": format!("{:?}", tx.from),
            "to": tx.to.map(|addr| format!("{:?}", addr)),
            "value": format_ether(&tx.value),
            "function": function_sig,
            "nonce": format!("{}", tx.nonce),
        },
        "gasDetails": {
            "gasLimit": format!("{}", tx.gas),
            "gasUsed": format!("{}", receipt.gas_used.unwrap_or_default()),
            "gasPrice": tx.gas_price.map(|g| format_gwei(&g)),
            "effectiveGasPrice": receipt.effective_gas_price.map(|g| format_gwei(&g)),
            "totalCost": calculate_gas_cost(receipt),
        },
        "events": format_events(&receipt.logs),
    });

    // Add state changes section
    if let Some(output) = cast_output {
        if let Some(obj) = trace.as_object_mut() {
            obj.insert("callTrace".to_string(), parse_call_trace(output));
        }
    }

    trace
}

/// Format Wei value to ETH with proper decimals
fn format_ether(wei: &ethers::types::U256) -> String {
    let eth_value = wei.as_u128() as f64 / 1e18;
    if eth_value == 0.0 {
        "0 ETH".to_string()
    } else if eth_value < 0.000001 {
        format!("{} wei", wei)
    } else {
        format!("{:.6} ETH", eth_value)
    }
}

/// Format Wei to Gwei
fn format_gwei(wei: &ethers::types::U256) -> String {
    let gwei_value = wei.as_u128() as f64 / 1e9;
    format!("{:.2} Gwei", gwei_value)
}

/// Calculate total gas cost in ETH
fn calculate_gas_cost(receipt: &TransactionReceipt) -> String {
    if let (Some(gas_used), Some(gas_price)) = (receipt.gas_used, receipt.effective_gas_price) {
        let cost = gas_used.saturating_mul(gas_price);
        format_ether(&cost)
    } else {
        "Unknown".to_string()
    }
}

/// Format logs/events in a readable way
fn format_events(logs: &[ethers::types::Log]) -> Vec<Value> {
    logs.iter().enumerate().map(|(idx, log)| {
        json!({
            "index": idx,
            "address": format!("{:?}", log.address),
            "name": decode_event_name(&log.topics),
            "topics": log.topics.iter().map(|t| format!("{:?}", t)).collect::<Vec<_>>(),
            "data": format!("0x{}", hex::encode(&log.data)),
        })
    }).collect()
}

/// Try to decode event name from topic[0]
fn decode_event_name(topics: &[ethers::types::H256]) -> String {
    if topics.is_empty() {
        return "Unknown Event".to_string();
    }
    
    // Common event signatures (you can expand this)
    let topic0 = format!("{:?}", topics[0]);
    match topic0.as_str() {
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" => "Transfer(address,address,uint256)".to_string(),
        "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925" => "Approval(address,address,uint256)".to_string(),
        _ => format!("Event({}...)", &topic0[..10]),
    }
}

/// Parse cast trace output into structured format
fn parse_call_trace(output: &str) -> Value {
    let mut traces = Vec::new();
    let lines: Vec<&str> = output.lines().collect();
    
    let mut current_trace = String::new();
    let mut depth = 0;
    
    for line in lines {
        // Skip empty lines
        if line.trim().is_empty() {
            continue;
        }
        
        // Check if this line starts a new call (has ├─ or └─)
        let is_call_start = line.contains("├─") || line.contains("└─");
        
        if is_call_start {
            // Save previous trace if exists
            if !current_trace.is_empty() {
                traces.push(json!({
                    "depth": depth,
                    "trace": current_trace.clone(),
                }));
                current_trace.clear();
            }
            
            // Calculate depth by counting │ and whitespace before the call marker
            // Each level adds "│   " (4 chars) or "    " (4 chars)
            let before_marker = if let Some(pos) = line.find("├─").or_else(|| line.find("└─")) {
                &line[..pos]
            } else {
                ""
            };
            
            // Count │ characters and divide spaces by 4 for depth
            depth = before_marker.matches('│').count();
            
            // Store the entire line as trace
            current_trace = line.trim().to_string();
        } else if !current_trace.is_empty() {
            // This is a continuation line (like return values, emits, etc.)
            current_trace.push_str(&format!("\n{}", line.trim()));
        }
    }
    
    // Don't forget the last trace
    if !current_trace.is_empty() {
        traces.push(json!({
            "depth": depth,
            "trace": current_trace,
        }));
    }
    
    json!({
        "formatted": true,
        "calls": traces,
        "raw": output,
    })
}

/// Format trace for console output with colors/formatting
pub fn format_trace_for_display(trace: &Value) -> String {
    let mut output = String::new();
    
    output.push_str("\n╔══════════════════════════════════════════════════════════════╗\n");
    output.push_str("║              TRANSACTION TRACE (Tenderly Style)              ║\n");
    output.push_str("╚══════════════════════════════════════════════════════════════╝\n\n");
    
    if let Some(overview) = trace.get("overview") {
        output.push_str("📋 OVERVIEW\n");
        output.push_str(&format!("   Status: {}\n", overview["status"].as_str().unwrap_or("Unknown")));
        output.push_str(&format!("   TX Hash: {}\n", overview["transactionHash"].as_str().unwrap_or("Unknown")));
        output.push_str(&format!("   Block: {}\n\n", overview["block"]));
    }
    
    if let Some(tx_info) = trace.get("transactionInfo") {
        output.push_str("💼 TRANSACTION INFO\n");
        output.push_str(&format!("   From: {}\n", tx_info["from"].as_str().unwrap_or("Unknown")));
        if let Some(to) = tx_info["to"].as_str() {
            output.push_str(&format!("   To: {}\n", to));
        }
        output.push_str(&format!("   Value: {}\n", tx_info["value"].as_str().unwrap_or("0")));
        output.push_str(&format!("   Function: {}\n\n", tx_info["function"].as_str().unwrap_or("Unknown")));
    }
    
    if let Some(gas) = trace.get("gasDetails") {
        output.push_str("⛽ GAS DETAILS\n");
        output.push_str(&format!("   Limit: {}\n", gas["gasLimit"].as_str().unwrap_or("Unknown")));
        output.push_str(&format!("   Used: {}\n", gas["gasUsed"].as_str().unwrap_or("Unknown")));
        if let Some(price) = gas["gasPrice"].as_str() {
            output.push_str(&format!("   Gas Price: {}\n", price));
        }
        output.push_str(&format!("   Total Cost: {}\n\n", gas["totalCost"].as_str().unwrap_or("Unknown")));
    }
    
    if let Some(events) = trace.get("events").and_then(|e| e.as_array()) {
        if !events.is_empty() {
            output.push_str(&format!("📢 EVENTS ({})\n", events.len()));
            for event in events.iter().take(5) {
                output.push_str(&format!("   • {} at {}\n", 
                    event["name"].as_str().unwrap_or("Unknown"),
                    event["address"].as_str().unwrap_or("Unknown")
                ));
            }
            if events.len() > 5 {
                output.push_str(&format!("   ... and {} more\n", events.len() - 5));
            }
            output.push_str("\n");
        }
    }
    
    if let Some(call_trace) = trace.get("callTrace") {
        if let Some(calls) = call_trace.get("calls").and_then(|c| c.as_array()) {
            output.push_str("🔍 CALL TRACE\n");
            for call in calls {
                let depth = call["depth"].as_u64().unwrap_or(0);
                let indent = "   ".repeat(depth as usize);
                output.push_str(&format!("{}└─ {}\n", indent, call["trace"].as_str().unwrap_or("Unknown")));
            }
        }
    }
    
    output.push_str("\n");
    output
}
