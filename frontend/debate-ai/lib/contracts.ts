import { ethers, BrowserProvider } from 'ethers';
import DebateFactoryABI from './abis/DebateFactory.json';
import DebateABI from './abis/Debate.json';

export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as string;

export interface DebateConfig {
  bondingTarget: bigint;
  bondingDuration: number;
  basePrice: bigint;
  minimumDuration: number;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  isValid: boolean;
}

export interface DebateInfo {
  topic: string;
  creator: string;
  token: string;
  currentRound: number;
  totalRounds: number;
  isActive: boolean;
  debateEndTime: number;
  bondingCurve: {
    target: bigint;
    current: bigint;
    basePrice: bigint;
    currentPrice: bigint;
    isFulfilled: boolean;
    endTime: number;
  };
}

export interface RoundInfo {
  isComplete: boolean;
  judgeCount: number;
  totalScore: number;
  startTime: number;
  endTime: number;
}

export interface BetInfo {
  amount: bigint;
  prediction: boolean;
  isEarlyBetter: boolean;
  evidence: string;
  twitterHandle: string;
}

export class DebateFactoryContract {
  private contract!: ethers.Contract;
  private signer!: ethers.Signer;

  static async create(provider: BrowserProvider): Promise<DebateFactoryContract> {
    const instance = new DebateFactoryContract();
    instance.signer = await provider.getSigner();
    instance.contract = new ethers.Contract(FACTORY_ADDRESS, DebateFactoryABI, instance.signer);
    return instance;
  }

  private constructor() {}

  async getDefaultConfig(): Promise<DebateConfig> {
    return await this.contract.defaultConfig();
  }

  async createDebate(
    topic: string,
    duration: number,
    tokenAddress: string,
    config: DebateConfig
  ): Promise<string> {
    const tx = await this.contract.createDebate(topic, duration, tokenAddress, config);
    const receipt = await tx.wait();
    const event = receipt.events?.find((e: any) => e.event === 'DebateCreated');
    return event?.args?.debateAddress;
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    return await this.contract.getTokenInfo(tokenAddress);
  }

  async getAllDebates(): Promise<string[]> {
    return await this.contract.allDebates();
  }
}

export class DebateContract {
  private contract!: ethers.Contract;
  private signer!: ethers.Signer;

  static async create(address: string, provider: BrowserProvider): Promise<DebateContract> {
    const instance = new DebateContract();
    instance.signer = await provider.getSigner();
    instance.contract = new ethers.Contract(address, DebateABI, instance.signer);
    return instance;
  }

  private constructor() {}

  async getDebateInfo(): Promise<DebateInfo> {
    const [
      topic,
      creator,
      token,
      currentRound,
      totalRounds,
      isActive,
      debateEndTime,
      bondingCurve
    ] = await Promise.all([
      this.contract.topic(),
      this.contract.creator(),
      this.contract.token(),
      this.contract.currentRound(),
      this.contract.totalRounds(),
      this.contract.isActive(),
      this.contract.debateEndTime(),
      this.contract.bondingCurve()
    ]);

    return {
      topic,
      creator,
      token,
      currentRound,
      totalRounds,
      isActive,
      debateEndTime,
      bondingCurve
    };
  }

  async placeBet(
    amount: bigint,
    prediction: boolean,
    evidence: string,
    twitterHandle: string
  ): Promise<void> {
    const tx = await this.contract.placeBet(amount, prediction, evidence, twitterHandle);
    await tx.wait();
  }

  async scoreRound(roundNumber: number, score: number): Promise<void> {
    const tx = await this.contract.scoreRound(roundNumber, score);
    await tx.wait();
  }

  async getRoundInfo(roundNumber: number): Promise<RoundInfo> {
    return await this.contract.getRoundInfo(roundNumber);
  }

  async getBetInfo(address: string): Promise<BetInfo> {
    return await this.contract.getBetInfo(address);
  }

  async getCurrentPrice(): Promise<bigint> {
    return await this.contract.getCurrentPrice();
  }
} 