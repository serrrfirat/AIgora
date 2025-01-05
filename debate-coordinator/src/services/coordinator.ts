import { RedisService } from './redis';
import { Market, Round, Gladiator } from '../types/market';
import { AgentMessage } from '../types/agent';
import { createPublicClient, http } from 'viem';
import { MARKET_FACTORY_ABI, MARKET_FACTORY_ADDRESS } from './contracts';
import { holesky } from 'viem/chains';

export class CoordinatorService {
  private redis: RedisService;
  private publicClient;

  constructor() {
    this.redis = new RedisService();
    this.publicClient = createPublicClient({
      chain: holesky,
      transport: http(process.env.RPC_URL)
    });
  }

  async initialize() {
    await this.redis.connect();
  }

  async cleanup() {
    await this.redis.disconnect();
  }

  async getActiveMarkets(): Promise<Market[]> {
    const data = await this.publicClient.readContract({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      functionName: 'getActiveMarkets',
      args: []
    });
    return data;
  }

  async getCurrentRound(marketId: bigint) {
    const data = await this.publicClient.readContract({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      functionName: 'getCurrentRound',
      args: [marketId]
    });

    return {
      roundIndex: Number(data[0]),
      startTime: data[1],
      endTime: data[2],
      isComplete: data[3]
    };
  }

  async getGladiators(marketId: bigint) {
    return await this.publicClient.readContract({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      functionName: 'getGladiators',
      args: [marketId]
    });
  }

  async getRoundVerdict(marketId: bigint, roundIndex: number) {
    const data = await this.publicClient.readContract({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      functionName: 'getRoundVerdict',
      args: [marketId, roundIndex]
    });

    return {
      scores: data[0],
      timestamp: data[1]
    };
  }

  async getRoundStatus(marketId: bigint, roundIndex: number) {
    const [round, messages, verdict] = await Promise.all([
      this.getCurrentRound(marketId),
      this.redis.getMessages(marketId, roundIndex),
      this.getRoundVerdict(marketId, roundIndex)
    ]);
    
    return {
      round,
      messages,
      verdict
    };
  }
  async getAllMessagesByMarketId(marketId: bigint){
    const messages = await this.redis.getAllMessagesByMarketId(marketId);
    return messages;
  }
  
}