import { ethers } from 'ethers';
import DebateFactoryABI from '../config/abis/DebateFactory.json';
import DebateABI from '../config/abis/MarketFactory.json';

export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as string;

export interface DebateConfig {
  bondingTarget: ethers.BigNumber;
  bondingDuration: number;
  basePrice: ethers.BigNumber;
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
    target: ethers.BigNumber;
    current: ethers.BigNumber;
    basePrice: ethers.BigNumber;
    currentPrice: ethers.BigNumber;
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
  amount: ethers.BigNumber;
  prediction: boolean;
  isEarlyBetter: boolean;
  evidence: string;
  twitterHandle: string;
}

export class DebateFactoryContract {
  private contract: ethers.Contract;
  private signer: ethers.Signer;

  constructor(provider: ethers.providers.Web3Provider) {
    this.signer = provider.getSigner();
    this.contract = new ethers.Contract(FACTORY_ADDRESS, DebateFactoryABI as any, this.signer);
  }

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
    const event = receipt.events?.find((e: { event: string }) => e.event === 'DebateCreated');
    return event?.args?.debateAddress;
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    return await this.contract.getTokenInfo(tokenAddress);
  }

  async getAllDebates(): Promise<string[]> {
    return await this.contract.getAllDebates();
  }
}

export class DebateContract {
  private contract: ethers.Contract;
  private signer: ethers.Signer;

  constructor(address: string, provider: ethers.providers.Web3Provider) {
    this.signer = provider.getSigner();
    this.contract = new ethers.Contract(address, DebateABI as any, this.signer);
  }

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
    amount: ethers.BigNumber,
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

  async getCurrentPrice(): Promise<ethers.BigNumber> {
    return await this.contract.getCurrentPrice();
  }
} 