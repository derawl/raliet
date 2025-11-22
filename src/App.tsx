import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TraceViewer } from "./components/TraceViewer";
import "./App.css";

function App() {
  const [txHash, setTxHash] = useState(
    "0x7e1b766cb4307a3dec2374b8ad01cae6a5eed96be3dfb8d3ae6b194d43aeaa6e"
  );
  const [rpcUrl, setRpcUrl] = useState("https://ethereum-rpc.publicnode.com");
  const [blockNumber, setBlockNumber] = useState("23812055");
  const [traceData, setTraceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [rpcList, setRpcList] = useState<Array<any>>(() => {
    try {
      const raw = localStorage.getItem("raliet_rpc_list");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  const [rpcLabel, setRpcLabel] = useState<string>("");
  const [rpcChain, setRpcChain] = useState<string>("");
  const [showRpcModal, setShowRpcModal] = useState(false);

  const [history, setHistory] = useState<Array<any>>(() => {
    try {
      const raw = localStorage.getItem("raliet_trace_history");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const saveHistory = (entry: any) => {
    try {
      setHistory((prev) => {
        const keyTx = (entry.txHash || "").toString().toLowerCase();
        const keyRpc = (entry.rpcUrl || "").toString().trim().toLowerCase();

        const existingIndex = prev.findIndex((h) => {
          const hTx = (h.txHash || "").toString().toLowerCase();
          const hRpc = (h.rpcUrl || "").toString().trim().toLowerCase();
          return hTx === keyTx && hRpc === keyRpc && keyTx !== "";
        });

        let next: Array<any>;
        if (existingIndex !== -1) {
          const copy = [...prev];
          copy.splice(existingIndex, 1);
          next = [entry, ...copy].slice(0, 100);
        } else {
          next = [entry, ...prev].slice(0, 100);
        }

        try {
          localStorage.setItem("raliet_trace_history", JSON.stringify(next));
        } catch (e) {
          console.warn(e);
        }

        return next;
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const saveRpc = (rpc: { label?: string; chain?: string; url: string }) => {
    try {
      const key = (rpc.url || "").toString().trim().toLowerCase();
      setRpcList((prev) => {
        const existing = prev.findIndex(
          (r) => (r.url || "").toString().trim().toLowerCase() === key
        );
        let next: Array<any>;
        const item = {
          label: rpc.label || rpc.url,
          chain: rpc.chain || "",
          url: rpc.url,
        };
        if (existing !== -1) {
          const copy = [...prev];
          copy.splice(existing, 1);
          next = [item, ...copy].slice(0, 50);
        } else {
          next = [item, ...prev].slice(0, 50);
        }
        try {
          localStorage.setItem("raliet_rpc_list", JSON.stringify(next));
        } catch (e) {
          console.warn(e);
        }
        return next;
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const deleteRpcAt = (index: number) => {
    const next = rpcList.filter((_, i) => i !== index);
    setRpcList(next);
    try {
      localStorage.setItem("raliet_rpc_list", JSON.stringify(next));
    } catch (e) {}
  };

  const selectRpc = (index: number) => {
    const r = rpcList[index];
    if (!r) return;
    setRpcUrl(r.url || "");
    setRpcLabel(r.label || "");
    setRpcChain(r.chain || "");
  };

  const deleteHistoryEntry = (index: number) => {
    const next = history.filter((_, i) => i !== index);
    setHistory(next);
    try {
      localStorage.setItem("raliet_trace_history", JSON.stringify(next));
    } catch (e) {}
  };

  const loadHistoryEntry = (index: number) => {
    const entry = history[index];
    if (!entry) return;
    setTxHash(entry.txHash || "");
    setRpcUrl(entry.rpcUrl || "");
    setBlockNumber(String(entry.blockNumber ?? ""));
    setTraceData(entry.trace || null);
  };

  async function debugTransaction() {
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
      setTraceData(res);
      try {
        const entry = {
          txHash,
          rpcUrl,
          blockNumber: parseInt(blockNumber),
          overview: res?.overview ?? null,
          trace: res ?? null,
          timestamp: Date.now(),
        };
        saveHistory(entry);
      } catch (e) {
        console.warn(e);
      }
    } catch (err: any) {
      console.error("Error calling debug_transaction:", err);

      // Extract meaningful error message
      let errorMsg = String(err);
      if (err.message) {
        errorMsg = err.message;
      }

      // Clean up the error message
      errorMsg = errorMsg.replace(/^Error:\s*/i, "");

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="desktop-app">
      <header className="app-titlebar">
        <div className="titlebar-left">
          <h1>🔍 Raliet</h1>
          <span className="subtitle">Transaction Debugger</span>
        </div>
        <div className="titlebar-right">
          {traceData && (
            <div className="transaction-summary">
              <span
                className={`status-badge ${
                  traceData.overview?.status === "Success"
                    ? "success"
                    : "failed"
                }`}
              >
                {traceData.overview?.status || "Unknown"}
              </span>
              <span className="gas-info">
                Gas: {traceData.overview?.gas_used || "N/A"}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="app-body">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? "›" : "‹"}
        </button>
        <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
          <div className="sidebar-section">
            <h3 className="section-title">Transaction Input</h3>
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

            <div className="input-group">
              <label htmlFor="rpc-url">RPC URL</label>
              <div className="rpc-select-row">
                <select
                  className="rpc-select"
                  value={rpcList.findIndex((r) => (r.url || "") === rpcUrl)}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    if (!isNaN(idx) && idx >= 0) selectRpc(idx);
                  }}
                >
                  <option value={-1}>-- Select saved --</option>
                  {rpcList.map((r, i) => (
                    <option key={i} value={i}>
                      {r.chain ? `${r.chain} — ${r.label}` : r.label}
                    </option>
                  ))}
                </select>
                <button
                  className="manage-btn"
                  onClick={() => setShowRpcModal(true)}
                >
                  Manage
                </button>
              </div>
              <input
                id="rpc-url"
                className="rpc-input-full"
                type="text"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="input-row">
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

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="debug-button"
                onClick={debugTransaction}
                disabled={loading || !txHash || !rpcUrl || !blockNumber}
              >
                {loading ? "Tracing..." : "🔍 Debug Transaction"}
              </button>
              <button
                className="save-history-button"
                disabled={!traceData}
                onClick={() =>
                  saveHistory({
                    txHash,
                    rpcUrl,
                    blockNumber: parseInt(blockNumber),
                    overview: traceData?.overview ?? null,
                    trace: traceData,
                    timestamp: Date.now(),
                  })
                }
              >
                💾 Save Trace
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="sidebar-section history-section">
            <h3 className="section-title">History</h3>
            <div className="history-list">
              {history.length === 0 && (
                <div className="empty">No traces yet</div>
              )}
              {history.map((h, i) => (
                <div key={i} className="history-item">
                  <div className="history-meta">
                    <div className="history-title">
                      {h.txHash?.slice(0, 10) ?? "—"}
                      <span className="muted">{h.overview?.status ?? ""}</span>
                    </div>
                    <div className="history-sub">Block #{h.blockNumber}</div>
                  </div>
                  <div className="history-actions">
                    <button
                      className="mini-btn"
                      onClick={() => loadHistoryEntry(i)}
                    >
                      Load
                    </button>
                    <button
                      className="mini-btn"
                      onClick={() => deleteHistoryEntry(i)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="main-content">
          {!traceData && !loading && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h2>No Transaction Loaded</h2>
              <p>
                Enter a transaction hash and click "Debug Transaction" to start
              </p>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Tracing transaction...</p>
            </div>
          )}

          {traceData && !loading && (
            <div className="debugger-panels">
              <div className="transaction-details-panel">
                <h3 className="panel-title">Transaction Details</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Transaction Hash</span>
                    <span className="detail-value mono" title={txHash}>
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">From</span>
                    <span
                      className="detail-value mono"
                      title={traceData.transactionInfo?.from}
                    >
                      {traceData.transactionInfo?.from
                        ? `${traceData.transactionInfo.from.slice(
                            0,
                            6
                          )}...${traceData.transactionInfo.from.slice(-4)}`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">To</span>
                    <span
                      className="detail-value mono"
                      title={traceData.transactionInfo?.to}
                    >
                      {traceData.transactionInfo?.to
                        ? `${traceData.transactionInfo.to.slice(
                            0,
                            6
                          )}...${traceData.transactionInfo.to.slice(-4)}`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Value</span>
                    <span className="detail-value">
                      {traceData.transactionInfo?.value || "0 ETH"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Gas Used</span>
                    <span className="detail-value">
                      {traceData.gasDetails?.gasUsed || "N/A"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Block</span>
                    <span className="detail-value">#{blockNumber}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span
                      className={`detail-value status-badge ${
                        traceData.overview?.status === "Success"
                          ? "success"
                          : "failed"
                      }`}
                    >
                      {traceData.overview?.status || "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="trace-panel">
                <TraceViewer trace={traceData} loading={loading} />
              </div>
            </div>
          )}
        </main>
      </div>

      {showRpcModal && (
        <div className="modal-backdrop" onClick={() => setShowRpcModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Manage RPCs</h3>
              <button
                className="mini-btn"
                onClick={() => setShowRpcModal(false)}
              >
                Close
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input
                  className="rpc-small"
                  placeholder="Label"
                  value={rpcLabel}
                  onChange={(e) => setRpcLabel(e.target.value)}
                />
                <input
                  className="rpc-small"
                  placeholder="Chain"
                  value={rpcChain}
                  onChange={(e) => setRpcChain(e.target.value)}
                />
                <input
                  className="rpc-input"
                  value={rpcUrl}
                  onChange={(e) => setRpcUrl(e.target.value)}
                  placeholder="https://..."
                />
                <button
                  className="mini-btn"
                  onClick={() => {
                    saveRpc({
                      label: rpcLabel || rpcUrl,
                      chain: rpcChain,
                      url: rpcUrl,
                    });
                    setRpcLabel("");
                    setRpcChain("");
                  }}
                >
                  Save
                </button>
              </div>
              <div className="rpc-list-inline">
                {rpcList.length === 0 && (
                  <div className="empty">No saved RPCs</div>
                )}
                {rpcList.map((r, i) => (
                  <div key={i} className="rpc-item">
                    <div>
                      <div className="rpc-meta">
                        {r.chain ? `${r.chain} · ` : ""}
                        {r.label}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {r.url}
                      </div>
                    </div>
                    <div className="rpc-actions">
                      <button
                        className="mini-btn"
                        onClick={() => {
                          selectRpc(i);
                          setShowRpcModal(false);
                        }}
                      >
                        Use
                      </button>
                      <button
                        className="mini-btn"
                        onClick={() => deleteRpcAt(i)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
