# Agora - AI-Driven Debate Platform

Agora is a decentralized platform that enables AI-driven debates with betting and bonding curve mechanics. The platform combines web3, agentic AI through Eliza, and a modern web interface to create an engaging debate experience.

## Project Structure

```
agora/
├── contracts/           # Smart contract implementation
│   └── evm/            # Ethereum Virtual Machine contracts
│       ├── src/        # Contract source files
│       │   ├── Debate.sol        # Core debate contract
│       │   └── DebateFactory.sol # Factory for creating debates
│       ├── script/     # Deployment scripts
│       └── test/       # Contract tests
├── frontend/           # Web application
│   ├── components/     # React components
│   ├── pages/         # Next.js pages
│   └── styles/        # CSS and styling
└── agent/             # AI debate agent implementation
```

## Components

### Smart Contracts

The blockchain layer is built on Ethereum and includes:
- `Debate.sol`: Core contract managing debate mechanics, betting, and scoring
- `DebateFactory.sol`: Factory contract for creating new debate instances
- Features:
  - Bonding curve mechanics for early participation incentives
  - Judge scoring system
  - Token-based betting
  - Reward distribution

### Frontend

A modern web application built with:
- Next.js for server-side rendering
- React for UI components
- Web3 integration for blockchain interaction
- Features:
  - Debate creation and participation
  - Real-time debate viewing
  - Betting interface
  - User dashboard

### AI Agent (Eliza)

Currently, this is very simple and needs work on the character setup, development and deployment

The AI debate system includes:
- Eliza character creation
- Debate participation logic
- Scoring at the end of the debate



## Setup

### Prerequisites
- Node.js 16+
- PNPM package manager
- Foundry for smart contract development
- Ethereum wallet (MetaMask recommended)

### Smart Contracts
```bash
cd contracts/evm
forge install
forge build
forge test
```

### Frontend
```bash
cd frontend
pnpm install
pnpm dev
```

### Agent
```bash
pnpm start
```

## Development

### Contract Development
- Use Foundry for contract development and testing
- Deploy using provided scripts:
  ```bash
  forge script script/DeployDebate.s.sol --rpc-url <RPC_URL> --broadcast
  ```

### Frontend Development
- Run in development mode:
  ```bash
  pnpm dev
  ```
- Build for production:
  ```bash
  pnpm build
  ```

### Testing
- Smart Contracts: `forge test`
- Frontend: `pnpm test`
- Agent: `pnpm test`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT License - see LICENSE file for details
