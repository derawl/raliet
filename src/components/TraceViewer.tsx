import { useState, useEffect } from "react";
import "./TraceViewer.css";

interface TraceData {
  overview?: {
    status: string;
    transactionHash: string;
    block: number;
  };
  transactionInfo?: {
    from: string;
    to?: string;
    value: string;
    function: string;
    nonce: string;
  };
  gasDetails?: {
    gasLimit: string;
    gasUsed: string;
    gasPrice?: string;
    effectiveGasPrice?: string;
    totalCost: string;
  };
  events?: Array<{
    index: number;
    address: string;
    name: string;
    topics: string[];
    data: string;
  }>;
  callTrace?: {
    formatted: boolean;
    calls: Array<{
      depth: number;
      trace: string;
    }>;
    raw: string;
  };
}

interface TraceViewerProps {
  trace: TraceData | null;
  loading?: boolean;
}

export function TraceViewer({ trace, loading }: TraceViewerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "events" | "functions" | "raw">("overview");
  const [selectedCallIndex, setSelectedCallIndex] = useState<number | null>(null);
  const [expandedCalls, setExpandedCalls] = useState<Set<number>>(new Set());

  // Auto-expand all nodes when trace loads
  useEffect(() => {
    if (trace?.callTrace?.calls) {
      const allIndices = new Set(trace.callTrace.calls.map((_, index) => index));
      setExpandedCalls(allIndices);
    }
  }, [trace]);

  if (loading) {
    return (
      <div className="trace-viewer loading">
        <div className="loading-spinner"></div>
        <p>Loading transaction trace...</p>
      </div>
    );
  }

  if (!trace) {
    return (
      <div className="trace-viewer empty">
        <p>No trace data available. Enter a transaction hash to debug.</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    return status.includes("Success") ? "✓" : "✗";
  };

  const getStatusClass = (status: string) => {
    return status.includes("Success") ? "success" : "failed";
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedCalls);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCalls(newExpanded);
  };

  // Build a tree structure from flat calls array
  const buildCallTree = (calls: any[]) => {
    const tree: any[] = [];
    const stack: any[] = [];
    
    calls.forEach((call, index) => {
      const node = {
        ...call,
        index,
        children: []
      };
      
      // Pop from stack until we find the parent
      while (stack.length > 0 && stack[stack.length - 1].depth >= call.depth) {
        stack.pop();
      }
      
      if (stack.length === 0) {
        // Root level
        tree.push(node);
      } else {
        // Add as child to parent
        stack[stack.length - 1].children.push(node);
      }
      
      stack.push(node);
    });
    
    console.log("Built tree structure:", tree);
    console.log("Total calls:", calls.length);
    return tree;
  };

  // Recursive component to render nested calls
  const renderCallTree = (nodes: any[], depth: number = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedCalls.has(node.index);
      const isSelected = selectedCallIndex === node.index;
      const hasChildren = node.children && node.children.length > 0;
      const [callSignature] = node.trace.split('\n');
      
      // Extract just the function name (before any parentheses or parameters)
      const functionNameMatch = callSignature.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      const functionName = functionNameMatch ? functionNameMatch[1] : callSignature.trim();
      
      // Check if this call reverted
      const hasReverted = node.trace.toLowerCase().includes('revert');
      
      console.log(`Rendering node ${node.index} - expanded: ${isExpanded}, hasChildren: ${hasChildren}, children:`, node.children);
      
      return (
        <div key={node.index} className="call-tree-node">
          <div
            className={`function-item ${isSelected ? 'selected' : ''} ${hasReverted ? 'reverted' : ''}`}
            style={{ paddingLeft: `${depth * 24 + 12}px` }}
            onClick={() => setSelectedCallIndex(node.index)}
          >
            {hasChildren ? (
              <span 
                className="expand-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.index);
                }}
              >
                {isExpanded ? "▼" : "▶"}
              </span>
            ) : (
              <span className="expand-spacer" />
            )}
            <span className={`call-depth depth-${node.depth}`}>
              {node.depth === 0 ? "📍" : "•"}
            </span>
            <span className="function-name">
              {functionName}
              {hasReverted && <span className="revert-indicator">⚠</span>}
            </span>
            {hasChildren && (
              <span className="child-count">({node.children.length})</span>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div className="call-children">
              {renderCallTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Helper to syntax highlight addresses, functions, and opcodes
  const highlightCode = (text: string) => {
    // Contract address pattern: Look for addresses with context like "Contract:", "@", or "→"
    const contractAddressPattern = /((?:Contract|@|→)\s*)(0x[a-fA-F0-9]{40})/g;
    // Regular address pattern: 0x followed by 40 hex chars
    const addressPattern = /(0x[a-fA-F0-9]{40})/g;
    // Function pattern: word followed by parentheses
    const functionPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    // Success/Stop patterns
    const successPattern = /\b(SUCCESS|STOP|OK)\b/gi;
    // Revert patterns
    const revertPattern = /\b(REVERT|REVERTED|ERROR|FAILED)\b/gi;
    // Opcode pattern: common EVM opcodes
    const opcodePattern = /\b(CALL|DELEGATECALL|STATICCALL|CREATE|CREATE2|SLOAD|SSTORE|MLOAD|MSTORE|RETURN|SELFDESTRUCT|LOG[0-4]|PUSH[0-9]+|DUP[0-9]+|SWAP[0-9]+|ADD|SUB|MUL|DIV|MOD|AND|OR|XOR|NOT|EQ|LT|GT|SLT|SGT|ISZERO|JUMP|JUMPI|PC|GAS|CALLDATALOAD|CALLDATASIZE|CODESIZE|CODECOPY|GASPRICE|EXTCODESIZE|EXTCODECOPY|RETURNDATASIZE|RETURNDATACOPY|BLOCKHASH|COINBASE|TIMESTAMP|NUMBER|DIFFICULTY|GASLIMIT|CHAINID|SELFBALANCE|BASEFEE|BALANCE|ORIGIN|CALLER|CALLVALUE|ADDRESS)\b/g;
    // Hex data pattern: 0x followed by hex chars
    const hexPattern = /(0x[a-fA-F0-9]+)/g;
    
    let result = text;
    
    // Replace contract addresses first (with context)
    result = result.replace(contractAddressPattern, '$1<span class="highlight-contract-address">$2</span>');
    
    // Replace success/stop keywords
    result = result.replace(successPattern, '<span class="highlight-success">$1</span>');
    
    // Replace revert/error keywords
    result = result.replace(revertPattern, '<span class="highlight-revert">$1</span>');
    
    // Replace remaining addresses (without context)
    result = result.replace(addressPattern, '<span class="highlight-address">$1</span>');
    
    // Replace functions
    result = result.replace(functionPattern, '<span class="highlight-function">$1</span>(');
    
    // Replace opcodes
    result = result.replace(opcodePattern, '<span class="highlight-opcode">$1</span>');
    
    // Replace remaining hex that aren't addresses
    result = result.replace(hexPattern, (match) => {
      if (match.length === 42) return match; // Already colored as address
      return `<span class="highlight-hex">${match}</span>`;
    });
    
    return result;
  };

  // Helper to color code raw trace like cast does
  const highlightRawTrace = (text: string) => {
    let result = text;
    
    // Tree characters in gray
    result = result.replace(/(├─|└─|│)/g, '<span class="trace-tree">$1</span>');
    
    // Gas costs in brackets - cyan
    result = result.replace(/\[(\d+)\]/g, '[<span class="trace-gas">$1</span>]');
    
    // Scientific notation - cyan
    result = result.replace(/\[([0-9.]+e[+-]?\d+)\]/g, '[<span class="trace-gas">$1</span>]');
    
    // Addresses - purple/magenta
    result = result.replace(/(0x[a-fA-F0-9]{40})/g, '<span class="trace-address">$1</span>');
    
    // Function names (word followed by opening paren, but not already highlighted)
    result = result.replace(/::([a-zA-Z_][a-zA-Z0-9_]*)\(/g, '::<span class="trace-function">$1</span>(');
    
    // Return/Stop in green
    result = result.replace(/← \[Return\]/g, '← [<span class="trace-success">Return</span>]');
    result = result.replace(/← \[Stop\]/g, '← [<span class="trace-success">Stop</span>]');
    
    // Revert in red
    result = result.replace(/← \[Revert\]/g, '← [<span class="trace-revert">Revert</span>]');
    
    // emit keyword in yellow
    result = result.replace(/emit\s+([a-zA-Z_][a-zA-Z0-9_]*)/g, '<span class="trace-emit">emit</span> <span class="trace-event">$1</span>');
    
    // delegatecall, staticcall, call in brackets - yellow
    result = result.replace(/\[(delegatecall|staticcall|call)\]/gi, '[<span class="trace-calltype">$1</span>]');
    
    // Hex data (longer hex values) - dim gray
    result = result.replace(/(0x[a-fA-F0-9]{8,}(?![a-fA-F0-9]))/g, (match) => {
      if (match.length === 42) return match; // Skip addresses
      return `<span class="trace-data">${match}</span>`;
    });
    
    return result;
  };

  return (
    <div className="trace-viewer">
      {/* Header with status */}
      {trace.overview && (
        <div className={`trace-header ${getStatusClass(trace.overview.status)}`}>
          <div className="status-badge">
            <span className="status-icon">{getStatusIcon(trace.overview.status)}</span>
            <span className="status-text">{trace.overview.status}</span>
          </div>
          <div className="tx-hash">
            <span className="label">Transaction Hash:</span>
            <code>{trace.overview.transactionHash}</code>
          </div>
          <div className="block-number">
            <span className="label">Block:</span>
            <code>{trace.overview.block}</code>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="trace-tabs">
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          📋 Overview
        </button>
        <button
          className={activeTab === "events" ? "active" : ""}
          onClick={() => setActiveTab("events")}
        >
          📢 Events {trace.events && `(${trace.events.length})`}
        </button>
        <button
          className={activeTab === "functions" ? "active" : ""}
          onClick={() => setActiveTab("functions")}
        >
          🔍 Call Trace
        </button>
        <button
          className={activeTab === "raw" ? "active" : ""}
          onClick={() => setActiveTab("raw")}
        >
          📝 Raw Trace
        </button>
      </div>

      {/* Tab Content */}
      <div className="trace-content">
        {activeTab === "overview" && (
          <div className="overview-tab">
            {/* Transaction Info */}
            {trace.transactionInfo && (
              <div className="info-section">
                <h3>💼 Transaction Info</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="label">From:</span>
                    <code className="address">{trace.transactionInfo.from}</code>
                  </div>
                  {trace.transactionInfo.to && (
                    <div className="info-row">
                      <span className="label">To:</span>
                      <code className="address">{trace.transactionInfo.to}</code>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="label">Value:</span>
                    <code className="value">{trace.transactionInfo.value}</code>
                  </div>
                  <div className="info-row">
                    <span className="label">Function:</span>
                    <code className="function">{trace.transactionInfo.function}</code>
                  </div>
                  <div className="info-row">
                    <span className="label">Nonce:</span>
                    <code>{trace.transactionInfo.nonce}</code>
                  </div>
                </div>
              </div>
            )}

            {/* Gas Details */}
            {trace.gasDetails && (
              <div className="info-section">
                <h3>⛽ Gas Details</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="label">Gas Limit:</span>
                    <code>{trace.gasDetails.gasLimit}</code>
                  </div>
                  <div className="info-row">
                    <span className="label">Gas Used:</span>
                    <code className="highlight">{trace.gasDetails.gasUsed}</code>
                  </div>
                  {trace.gasDetails.gasPrice && (
                    <div className="info-row">
                      <span className="label">Gas Price:</span>
                      <code>{trace.gasDetails.gasPrice}</code>
                    </div>
                  )}
                  {trace.gasDetails.effectiveGasPrice && (
                    <div className="info-row">
                      <span className="label">Effective Gas Price:</span>
                      <code>{trace.gasDetails.effectiveGasPrice}</code>
                    </div>
                  )}
                  <div className="info-row total-cost">
                    <span className="label">Total Cost:</span>
                    <code className="highlight">{trace.gasDetails.totalCost}</code>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "events" && (
          <div className="events-tab">
            {trace.events && trace.events.length > 0 ? (
              <div className="events-list">
                {trace.events.map((event, idx) => (
                  <div key={idx} className="event-item">
                    <div className="event-header">
                      <span className="event-index">#{event.index}</span>
                      <span className="event-name">{event.name}</span>
                      <code className="event-address">{event.address}</code>
                    </div>
                    <div className="event-details">
                      <div className="event-topics">
                        <strong>Topics:</strong>
                        {event.topics.map((topic, i) => (
                          <code key={i} className="topic">{topic}</code>
                        ))}
                      </div>
                      <div className="event-data">
                        <strong>Data:</strong>
                        <code className="data">{event.data}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No events emitted in this transaction</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "functions" && (
          <div className="functions-tab">
            {trace.callTrace && trace.callTrace.calls && trace.callTrace.calls.length > 0 ? (
              <div className="split-view">
                {/* Left Panel - Function List */}
                <div className="functions-panel">
                  <div className="panel-header">Function Call Tree</div>
                  <div className="functions-list">
                    {renderCallTree(buildCallTree(trace.callTrace.calls))}
                  </div>
                </div>
                
                {/* Right Panel - Execution Details */}
                <div className="execution-panel">
                  <div className="panel-header">Execution Details</div>
                  <div className="execution-content">
                    {selectedCallIndex !== null && trace.callTrace.calls[selectedCallIndex] ? (
                      <div className="selected-call-details">
                        <div className="call-header-info">
                          <code 
                            className="call-name"
                            dangerouslySetInnerHTML={{ 
                              __html: highlightCode(trace.callTrace.calls[selectedCallIndex].trace.split('\n')[0]) 
                            }}
                          />
                        </div>
                        <div className="call-execution">
                          {trace.callTrace.calls[selectedCallIndex].trace.split('\n').slice(1).map((line, i) => (
                            line.trim() && (
                              <div key={i} className="execution-line">
                                <span className="line-number">{i + 1}</span>
                                <code dangerouslySetInnerHTML={{ __html: highlightCode(line) }} />
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p>Select a function call to see execution details</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No function calls available</p>
                {trace.callTrace?.raw && (
                  <details className="raw-trace">
                    <summary>Show raw trace output</summary>
                    <pre dangerouslySetInnerHTML={{ __html: highlightCode(trace.callTrace.raw) }} />
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "raw" && (
          <div className="raw-tab">
            {trace.callTrace?.raw ? (
              <div className="raw-trace-container">
                <pre className="raw-trace-output" dangerouslySetInnerHTML={{ __html: highlightRawTrace(trace.callTrace.raw) }} />
              </div>
            ) : (
              <div className="empty-state">
                <p>No raw trace data available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
