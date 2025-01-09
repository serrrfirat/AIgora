import { createClient } from 'redis';
import { Market, Round, Gladiator } from '../types/market';
import { AgentMessage, JudgeVerdict } from '../types/agent';

export class RedisService {
  private client;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.quit();
  }

  // Market methods
  async setMarket(market: Market) {
    await this.client.set(`market:${market.id}`, JSON.stringify(market));
  }

  async getMarket(marketId: bigint): Promise<Market | null> {
    const data = await this.client.get(`market:${marketId}`);
    return data ? JSON.parse(data) : null;
  }

  // Round methods
  async setRound(marketId: bigint, roundIndex: number, round: Round) {
    await this.client.set(`market:${marketId}:round:${roundIndex}`, JSON.stringify(round));
  }

  async getRound(marketId: bigint, roundIndex: number): Promise<Round | null> {
    const data = await this.client.get(`market:${marketId}:round:${roundIndex}`);
    return data ? JSON.parse(data) : null;
  }

  async getCurrentRound(marketId: bigint): Promise<{
    roundIndex: number;
    startTime: bigint;
    endTime: bigint;
    isComplete: boolean;
  } | null> {
    const market = await this.getMarket(marketId);
    if (!market) return null;

    const roundIndex = Number(market.currentRound) - 1;
    if (roundIndex < 0) return null;

    const round = await this.getRound(marketId, roundIndex);
    if (!round) return null;

    return {
      roundIndex,
      startTime: round.startTime,
      endTime: round.endTime,
      isComplete: round.isComplete
    };
  }

  // Gladiator methods
  async setGladiator(marketId: bigint, gladiator: Gladiator) {
    await this.client.set(
      `market:${marketId}:gladiator:${gladiator.index}`, 
      JSON.stringify(gladiator)
    );
  }

  async getGladiator(marketId: bigint, gladiatorIndex: bigint): Promise<Gladiator | null> {
    const data = await this.client.get(`market:${marketId}:gladiator:${gladiatorIndex}`);
    return data ? JSON.parse(data) : null;
  }

  async getGladiators(marketId: bigint): Promise<Gladiator[]> {
    const market = await this.getMarket(marketId);
    if (!market) return [];

    const gladiators: Gladiator[] = [];
    for (let i = 0; i < 2; i++) { // Assuming 2 gladiators per market
      const gladiator = await this.getGladiator(marketId, BigInt(i));
      if (gladiator) gladiators.push(gladiator);
    }
    return gladiators;
  }

  async getVerdict(marketId: bigint, roundIndex: number): Promise<{
    scores: number[];
    timestamp: bigint;
  } | null> {
    const round = await this.getRound(marketId, roundIndex);
    if (!round || !round.verdict) return null;

    return {
      scores: round.verdict.scores.map(score => Number(score)),
      timestamp: round.verdict.timestamp
    };
  }

  // Message methods
  async addMessage(marketId: bigint, roundIndex: number, message: AgentMessage) {
    const key = `market:${marketId}:round:${roundIndex}:messages`;
    await this.client.rPush(key, JSON.stringify(message));
  }

  async getMessages(marketId: bigint, roundIndex: number): Promise<AgentMessage[]> {
    const key = `market:${marketId}:round:${roundIndex}:messages`;
    const data = await this.client.lRange(key, 0, -1);
    return data.map(msg => JSON.parse(msg));
  }

  async getAllMessagesByMarketId(marketId: bigint): Promise<AgentMessage[]> {
    const data = await this.client.keys(`market:${marketId}:*`);
    return data.map(msg => JSON.parse(msg));
  }
} 