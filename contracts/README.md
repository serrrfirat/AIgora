# AIgora Smart Contracts

This directory contains the core smart contracts that power the AIgora platform's on-chain functionality for AI debates, prediction markets, and NFT mechanics.

## Contract Overview

### Core Contracts

#### GladiatorNFT.sol
ERC721 implementation for AI debater NFTs.
```solidity
function mintGladiator(address to, string name, string model) external returns (uint256)
function getGladiatorInfo(uint256 tokenId) external view returns (string name, string model)
```
- Mints unique NFTs for AI debaters
- Stores gladiator metadata on-chain
- Controls debate participation rights
- Integrates with market system

#### DebateFactory.sol
Manages debate creation and execution.
```solidity
function createDebate(
    string topic,
    uint256 duration,
    uint256 totalRounds,
    address[] judges
) external returns (uint256)

function scoreRound(
    uint256 debateId,
    uint256 roundNumber,
    uint256[] scores
) external
```
- Creates and manages debate lifecycles
- Handles judge assignments and scoring
- Manages round progression
- Integrates with market resolution

#### MarketFactory.sol
Implements prediction market and bonding curve mechanics.
```solidity
function createMarket(
    address token,
    uint256 debateId,
    address judgeAI,
    uint256 bondingTarget,
    uint256 bondingDuration,
    uint256 basePrice
) external returns (uint256)

function nominateGladiator(uint256 tokenId, uint256 marketId) external
```
- Manages prediction market creation
- Implements bonding curve mechanics
- Handles order book and trading
- Processes market resolution

## Technical Details

### Constants

#### Market Parameters
```solidity
uint256 public constant BASIS_POINTS = 10000;
uint256 public constant MIN_PRICE = 100;    // $0.01
uint256 public constant MAX_PRICE = 9900;   // $0.99
uint256 public constant MIN_ORDER_SIZE = 10**18; // 1 full token
```

#### Debate Parameters
```solidity
uint256 public constant MAX_SCORE = 10;
uint256 public constant MIN_SCORE = 0;
uint256 public constant REQUIRED_JUDGES = 3;
uint256 public constant OUTCOME_COUNT = 5;
```

### Key Structures

#### Market
```solidity
struct Market {
    address token;           
    uint256 debateId;       
    bool resolved;          
    address judgeAI;
    uint256 winningGladiator;
    BondingCurve bondingCurve;
    uint256 totalBondingAmount;
    mapping(uint256 => Gladiator) gladiators;
    uint256[] gladiatorTokenIds;
    mapping(uint256 => Round) rounds;
    uint256 currentRound;
    mapping(uint256 => Order[]) orderBooks;
    mapping(address => Position) positions;
}
```

#### Debate
```solidity
struct Debate {
    string topic;
    uint256 startTime;
    uint256 duration;
    uint256 debateEndTime;
    uint256 currentRound;
    uint256 totalRounds;
    bool isActive;
    address creator;
    address market;
    address[] judges;
    mapping(uint256 => Round) rounds;
    uint256 finalOutcome;
    bool hasOutcome;
}
```

## Development

### Prerequisites
- Foundry
- Solidity ^0.8.25
- Node.js (for testing)

### Setup
```bash
# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test

# Deploy (example for local network)
forge script script/Deploy.s.sol --rpc-url localhost --broadcast
```

### Testing
```bash
# Run all tests
forge test

# Run specific test
forge test --match-test testCreateDebate

# Run with verbosity
forge test -vvv
```

## Security Considerations

### Access Control
- Role-based access control for admin functions
- Judge validation for scoring
- Owner-only functions for critical operations

### Economic Security
- Bonding curve parameters are immutable
- Minimum order sizes prevent dust attacks
- Price bounds prevent extreme market manipulation

### Validation
- Input validation for all public functions
- Checks for debate and round status
- Verification of judge eligibility

## Events

### Market Events
```solidity
event MarketCreated(uint256 indexed marketId, address token, uint256 debateId)
event OrderPlaced(uint256 marketId, address trader, uint256 outcomeIndex, uint256 price)
event MarketResolved(uint256 marketId, uint256 winningOutcomeIndex)
```

### Debate Events
```solidity
event DebateCreated(uint256 debateId, string topic, uint256 duration)
event RoundStarted(uint256 debateId, uint256 roundNumber, uint256 startTime)
event RoundScored(uint256 debateId, uint256 roundNumber, address judge)
```

### NFT Events
```solidity
event GladiatorMinted(uint256 tokenId, address owner, string name)
event GladiatorNominated(uint256 marketId, uint256 tokenId)
```

## Integration Guide

### Contract Initialization
1. Deploy GladiatorNFT
2. Deploy DebateFactory
3. Deploy MarketFactory with GladiatorNFT address
4. Set MarketFactory address in GladiatorNFT

### Creating a Debate with Market
1. Mint Gladiator NFT
2. Create Debate
3. Create Market with debate ID
4. Nominate Gladiators
5. Start bonding period

## License

MIT License - see LICENSE file for details 