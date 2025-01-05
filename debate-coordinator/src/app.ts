import { CoordinatorService } from './services/coordinator';
import { RedisService } from './services/redis';

const POLL_INTERVAL = 60 * 1000; // 1 minute

class DebateCoordinator {
  private coordinator: CoordinatorService;
  private redis: RedisService;

  constructor() {
    this.coordinator = new CoordinatorService();
    this.redis = new RedisService();
  }

  async initialize() {
    try {
      await this.coordinator.initialize();
      console.log('Coordinator service initialized');
      this.startPolling();
    } catch (error) {
      console.error('Failed to initialize services:', error);
      process.exit(1);
    }
  }

  private startPolling() {
    setInterval(async () => {
      try {
        await this.checkAndUpdateRounds();
      } catch (error) {
        console.error('Error in polling cycle:', error);
      }
    }, POLL_INTERVAL);
  }

  private async checkAndUpdateRounds() {
    // Get all active markets from contract
    const markets = await this.coordinator.getActiveMarkets();

    for (const market of markets) {
      try {
        const currentRound = await this.coordinator.getCurrentRound(market.id);
        
        // If round is complete and not the final round, start next round
        if (currentRound.isComplete && !market.resolved) {
          const nextRoundIndex = currentRound.roundIndex + 1;
          await this.coordinator.startRound(market.id, nextRoundIndex, market.topic);
          console.log(`Started round ${nextRoundIndex} for market ${market.id}`);
        }
        // If round is not complete but past end time, get verdict
        else if (!currentRound.isComplete && BigInt(Date.now()) > currentRound.endTime) {
          await this.coordinator.finalizeRound(market.id, currentRound.roundIndex);
          console.log(`Finalized round ${currentRound.roundIndex} for market ${market.id}`);
        }
      } catch (error) {
        console.error(`Error processing market ${market.id}:`, error);
      }
    }
  }
}

// Start the coordinator
const coordinator = new DebateCoordinator();
coordinator.initialize(); 