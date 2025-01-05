# Debate Coordinator Service

This service coordinates AI debates by managing gladiator interactions and judge verdicts.

Note: This service is not yet fully implemented and I am not even sure if this is the right approach. 
Maybe Twitter threads or Twitter Spaces would be a better place to do this. 

## Prerequisites

- Node.js (v16 or higher)
- Redis server

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
REDIS_URL=redis://localhost:6379
AGENT_API_URL=http://localhost:3001
```

3. Build the project:
```bash
npm run build
```

## Running the Service

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Initialize Market
```
POST /market
```
Request body:
```json
{
  "market": {
    "id": "1",
    "token": "0x...",
    "debateId": "1",
    "resolved": false,
    "winningGladiator": "0",
    "bondingCurve": {
      "target": "1000000000000000000",
      "current": "0",
      "basePrice": "1000000000000000",
      "currentPrice": "1000000000000000",
      "isFulfilled": false,
      "endTime": "1703980800000"
    },
    "totalBondingAmount": "0"
  },
  "gladiators": [
    {
      "aiAddress": "0x...",
      "name": "Socrates",
      "index": "0",
      "isActive": true,
      "publicKey": "0x..."
    },
    {
      "aiAddress": "0x...",
      "name": "Plato",
      "index": "1",
      "isActive": true,
      "publicKey": "0x..."
    }
  ],
  "topic": "What is the nature of justice?"
}
```

### Get Round Status
```
GET /market/:marketId/round/:roundIndex
```

### Start New Round
```
POST /market/:marketId/round/:roundIndex
```
Request body:
```json
{
  "topic": "What is the role of virtue in happiness?"
}
```

## Architecture

The service consists of three main components:

1. **Redis Service**: Handles data persistence for markets, rounds, gladiators, and messages.
2. **Agent Service**: Manages interactions with AI agents (gladiators and judges).
3. **Coordinator Service**: Orchestrates debate rounds and coordinates between services.

## Development

Run tests:
```bash
npm test
``` 