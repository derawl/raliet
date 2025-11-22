# 🔍 Raliet - Transaction Debugger

A powerful desktop application for debugging and analyzing Ethereum transactions with detailed call traces, gas profiling, and event inspection. Built with Tauri, React, and TypeScript for a fast, native experience.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.1-green.svg)

## ✨ Features

- **🔍 Transaction Tracing**: Debug any Ethereum transaction by hash with detailed execution traces
- **🌳 Call Tree Visualization**: Interactive tree view of all function calls with expand/collapse
- **⚡ Gas Profiling**: Track gas consumption for each call and operation
- **📊 Event Inspection**: View all emitted events with decoded parameters
- **🔄 Transaction History**: Save and manage your debugging sessions
- **🌐 Multi-Chain Support**: Works with any EVM-compatible chain via RPC
- **💾 RPC Management**: Save and switch between multiple RPC endpoints
- **🎨 Modern UI**: Dark theme with professional desktop app aesthetics
- **📋 Copy & Export**: Easy copying of call signatures, traces, and addresses
- **🔎 Search & Filter**: Find specific calls and events in complex transactions

## 🛠️ Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Desktop Framework**: Tauri v2
- **Backend**: Rust with ethers.rs
- **Blockchain Tools**:
  - Anvil (for transaction forking)
  - Cast (for trace generation)
- **Storage**: LocalStorage for persistence

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Rust** (latest stable version)
- **Foundry** (for Anvil and Cast)
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```

## 🚀 Getting Started

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/derawl/raliet.git
   cd raliet
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run tauri dev
   ```

### Building for Production

```bash
npm run tauri build
```

The built application will be available in `src-tauri/target/release/`.

## 📖 Usage

### Basic Workflow

1. **Enter Transaction Details**

   - Paste the transaction hash
   - Select or enter an RPC URL
   - Specify the block number

2. **Debug Transaction**

   - Click "🔍 Debug Transaction"
   - Wait for the trace to complete (may take up to 2 minutes for complex transactions)

3. **Explore the Results**

   - **Overview**: Transaction metadata and gas details
   - **Events**: All emitted events with decoded data
   - **Functions**: Interactive call tree with execution details
   - **Raw**: Complete raw trace output

4. **Save for Later**
   - Click "💾 Save Trace" to add to history
   - Access saved traces from the History panel

### RPC Management

1. Click "Manage" in the RPC section
2. Enter a label, chain name, and RPC URL
3. Click "Save" to add to your list
4. Select from dropdown to quickly switch between RPCs

### Tips

- **Archive Node Required**: Some older transactions require an archive node RPC
- **Collapsible Sidebar**: Click the arrow button to collapse/expand the sidebar
- **Search in Call Tree**: Use the search box to filter specific function calls
- **Copy Functionality**: Click copy buttons to grab addresses, call signatures, or entire traces

## 🏗️ Project Structure

```
raliet/
├── src/                      # React frontend
│   ├── App.tsx              # Main application component
│   ├── App.css              # Desktop app styling
│   └── components/
│       ├── TraceViewer.tsx  # Trace visualization component
│       └── TraceViewer.css  # Trace viewer styles
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── lib.rs          # Tauri entry point
│   │   ├── types.rs        # Type definitions
│   │   └── core/
│   │       ├── simulator_debug.rs    # Transaction debugging logic
│   │       ├── trace_formatter.rs    # Trace parsing and formatting
│   │       └── transaction_simulator.rs
│   └── Cargo.toml          # Rust dependencies
└── package.json            # Node dependencies

```

## 🔧 Configuration

### Custom Timeouts

Transaction tracing timeout is set to 120 seconds by default. To modify:

Edit `src-tauri/src/core/simulator_debug.rs`:

```rust
let cast_timeout = Duration::from_secs(120); // Adjust as needed
```

### Styling

The app uses a dark theme with customizable CSS variables in `src/App.css`:

```css
:root {
  --bg-primary: #18181b;
  --bg-secondary: #27272a;
  --border-color: #3f3f46;
  --text-primary: #e4e4e7;
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Known Issues

- Transactions on non-archive nodes may fail for old blocks
- Very complex transactions (>10k calls) may be slow to render
- Windows: First launch may require allowing through Windows Defender

## 🗺️ Roadmap

- [ ] Advanced debugger panel with stack/memory/storage inspection
- [ ] Gas profiler with flame chart visualization
- [ ] Contract source code viewing
- [ ] Multi-transaction comparison
- [ ] Export traces to JSON/CSV
- [ ] Native menu integration (pending Tauri v2 updates)

## 📄 License

This project is licensed under the MIT License

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/)
- Transaction tracing powered by [Foundry](https://getfoundry.sh/)
- Inspired by [Tenderly](https://tenderly.co/) and [Etherscan](https://etherscan.io/)

## 📧 Contact

- GitHub: [@derawl](https://github.com/derawl)
- Repository: [raliet](https://github.com/derawl/raliet)

---

**Made with ❤️ for the EVM developer community**
