import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TraceViewer } from "./components/TraceViewer";
import "./App.css";

function App() {
  const [txHash, setTxHash] = useState("0x7e1b766cb4307a3dec2374b8ad01cae6a5eed96be3dfb8d3ae6b194d43aeaa6e");
  const [rpcUrl, setRpcUrl] = useState("https://ethereum-rpc.publicnode.com");
  const [blockNumber, setBlockNumber] = useState("23812055");
  const [traceData, setTraceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function debugTransaction() {
    console.log("Starting debug_transaction call...");
    setLoading(true);
    setError("");
    setTraceData(null);
    
    try {
      const result = await invoke("debug_transaction", {
        txHash,
        rpcUrl,
        block: parseInt(blockNumber),
      });
      let res = JSON.parse(result as string);
      console.log("Debug transaction result:", res);
      console.log("Result type:", typeof res);
      console.log("Result keys:", res ? Object.keys(res as any) : "null");
      setTraceData(res);
    } catch (err) {
      console.error("Error calling debug_transaction:", err);
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-container">
      <div className="app-header">
        <h1>🔍 Raliet</h1>
      </div>

      <div className="input-section">
        <div className="input-group">
          <label htmlFor="tx-hash">Transaction Hash</label>
          <input
            id="tx-hash"
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="0x..."
          />
        </div>

        <div className="input-row">
          <div className="input-group">
            <label htmlFor="rpc-url">RPC URL</label>
            <input
              id="rpc-url"
              type="text"
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="input-group">
            <label htmlFor="block-number">Block Number</label>
            <input
              id="block-number"
              type="text"
              value={blockNumber}
              onChange={(e) => setBlockNumber(e.target.value)}
              placeholder="Block number"
            />
          </div>
        </div>

        <button 
          className="debug-button"
          onClick={debugTransaction}
          disabled={loading || !txHash || !rpcUrl || !blockNumber}
        >
          {loading ? "Tracing..." : "🔍 Debug Transaction"}
        </button>

        {error && <div className="error-message">{error}</div>}
      </div>

      <TraceViewer trace={traceData} loading={loading} />
    </main>
  );
}

export default App;
