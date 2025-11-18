use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ethers::types::{H160, U256};
use serde_json::Value;

/// Configuration interface for transaction simulation
/// Includes all parameters needed to simulate an EVM transaction
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulationConfig {
    // Network configuration
    pub rpc_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fork_block_number: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub anvil_port: Option<u16>,

    // Transaction details
    pub from: String,
    pub to: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gas_limit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gas_price: Option<String>,

    // Contract interaction
    #[serde(skip_serializing_if = "Option::is_none")]
    pub function_signature: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub function_params: Option<Vec<serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_data: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub abi: Option<String>,

    // Simulation options
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trace_enabled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub use_pending_block: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub override_block_number: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub override_timestamp: Option<u64>,
}

/// Result of a transaction simulation
/// Contains all relevant data from the simulation including traces
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulationResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transaction_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gas_used: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logs: Option<Vec<serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trace: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub return_data: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decoded_return_data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_output: Option<String>,
}

/// Supported EVM networks with their RPC URLs and chain IDs
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkConfig {
    pub name: String,
    pub chain_id: u64,
    pub rpc_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_explorer: Option<String>,
}

/// Common networks configuration
pub fn get_networks() -> HashMap<String, NetworkConfig> {
    let mut networks = HashMap::new();
    
    networks.insert(
        "mainnet".to_string(),
        NetworkConfig {
            name: "Ethereum Mainnet".to_string(),
            chain_id: 1,
            rpc_url: "https://eth.llamarpc.com".to_string(),
            block_explorer: Some("https://etherscan.io".to_string()),
        },
    );
    
    networks.insert(
        "sepolia".to_string(),
        NetworkConfig {
            name: "Sepolia Testnet".to_string(),
            chain_id: 11155111,
            rpc_url: "https://ethereum-sepolia-rpc.publicnode.com".to_string(),
            block_explorer: Some("https://sepolia.etherscan.io".to_string()),
        },
    );
    
    networks.insert(
        "polygon".to_string(),
        NetworkConfig {
            name: "Polygon".to_string(),
            chain_id: 137,
            rpc_url: "https://rpc.ankr.com/polygon".to_string(),
            block_explorer: Some("https://polygonscan.com".to_string()),
        },
    );
    
    networks.insert(
        "arbitrum".to_string(),
        NetworkConfig {
            name: "Arbitrum One".to_string(),
            chain_id: 42161,
            rpc_url: "https://rpc.ankr.com/arbitrum".to_string(),
            block_explorer: Some("https://arbiscan.io".to_string()),
        },
    );
    
    networks.insert(
        "monad".to_string(),
        NetworkConfig {
            name: "Monad Testnet".to_string(),
            chain_id: 41455,
            rpc_url: "https://rpc.ankr.com/monad_testnet".to_string(),
            block_explorer: Some("https://testnet.monad.xyz".to_string()),
        },
    );
    
    networks
}

/// ABI parameter definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbiParam {
    pub name: String,
    #[serde(rename = "type")]
    pub type_: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub indexed: Option<bool>,
}

/// ABI entry for function/event definitions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum AbiEntry {
    Function {
        #[serde(skip_serializing_if = "Option::is_none")]
        name: Option<String>,
        inputs: Vec<AbiParam>,
        #[serde(skip_serializing_if = "Option::is_none")]
        outputs: Option<Vec<AbiParam>>,
        #[serde(skip_serializing_if = "Option::is_none", rename = "stateMutability")]
        state_mutability: Option<StateMutability>,
    },
    Constructor {
        inputs: Vec<AbiParam>,
        #[serde(skip_serializing_if = "Option::is_none", rename = "stateMutability")]
        state_mutability: Option<StateMutability>,
    },
    Event {
        #[serde(skip_serializing_if = "Option::is_none")]
        name: Option<String>,
        inputs: Vec<AbiParam>,
    },
    Error {
        #[serde(skip_serializing_if = "Option::is_none")]
        name: Option<String>,
        inputs: Vec<AbiParam>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StateMutability {
    Pure,
    View,
    Nonpayable,
    Payable,
}

/// Contract information including ABI and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractInfo {
    pub address: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub abi: Option<Vec<AbiEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verified: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

/// Transaction trace information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionTrace {
    #[serde(rename = "type")]
    pub type_: String,
    pub from: String,
    pub to: String,
    pub value: String,
    pub gas: String,
    pub gas_used: String,
    pub input: String,
    pub output: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub calls: Option<Vec<TransactionTrace>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Decoded event arguments
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecodedEvent {
    pub name: String,
    pub args: HashMap<String, serde_json::Value>,
}

/// Event log from transaction execution
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventLog {
    pub address: String,
    pub topics: Vec<String>,
    pub data: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_number: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transaction_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub log_index: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decoded: Option<DecodedEvent>,
}

/// Binary platform information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BinaryPlatforms {
    pub win32: String,
    pub darwin: String,
    pub linux: String,
}

/// Binary download configuration for bundling anvil/cast
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BinaryConfig {
    pub name: String,
    pub version: String,
    pub platforms: BinaryPlatforms,
    pub download_url: String,
}

/// Simulation session that can contain multiple transactions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulationSession {
    pub id: String,
    pub name: String,
    pub network: NetworkConfig,
    pub fork_block: u64,
    pub transactions: Vec<SimulationResult>,
    pub created: String, // ISO 8601 datetime string
    pub modified: String, // ISO 8601 datetime string
}

impl SimulationSession {
    pub fn new(id: String, name: String, network: NetworkConfig, fork_block: u64) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id,
            name,
            network,
            fork_block,
            transactions: Vec::new(),
            created: now.clone(),
            modified: now,
        }
    }
}

#[derive(Debug, Clone)]
pub struct SimulatorDebugInfo {
    pub from: H160,
    pub to: Option<H160>,
    pub value: U256,
    pub gas_estimate: U256,
    pub call_result: Result<Vec<u8>, String>, // Ok if successful, Err if revert
    pub trace: Value, 
}