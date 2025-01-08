import { RedisService } from './redis';
import { Market, Round, Gladiator, Debate } from '../types/market';
import { AgentMessage } from '../types/agent';
import { createPublicClient, createWalletClient, http, webSocket } from 'viem';
import { DEBATE_FACTORY_ABI, DEBATE_FACTORY_ADDRESS, MARKET_FACTORY_ABI, MARKET_FACTORY_ADDRESS } from './contracts';
import { holesky } from 'viem/chains';
import { TwitterApi } from 'twitter-api-v2';
import { Scraper } from 'agent-twitter-client';

export class CoordinatorService {
  private redis: RedisService;
  private publicClient;
  private wsClient;
  private scraper: Scraper;
  constructor() {
    if (!process.env.RPC_URL) throw new Error('RPC_URL environment variable is not set');
    if (!process.env.WSS_RPC_URL) throw new Error('WSS_RPC_URL environment variable is not set');

    this.redis = new RedisService();
    this.scraper = new Scraper();
    

    // Initialize WebSocket client for event listening
    this.wsClient = createPublicClient({
      chain: holesky,
      transport: webSocket(process.env.WSS_RPC_URL)
    });

    // Initialize HTTP client for regular calls
    this.publicClient = createPublicClient({
      chain: holesky,
      transport: http(process.env.RPC_URL)
    });

  }

  async initialize() {
    await this.redis.connect();
    await this.scraper.login(process.env.TWITTER_USERNAME!, process.env.TWITTER_PASSWORD!)
    await this.handleBondingComplete(BigInt(5))
    await this.startEventListening();
  }

  async cleanup() {
    await this.redis.disconnect();
    await this.wsClient.destroy();
  }

  private async startEventListening() {
    console.log('Starting event listening...');

    // Listen for BondingComplete events
    const unwatch = await this.wsClient.watchContractEvent({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      eventName: 'BondingComplete',
      onLogs: async (logs) => {
        for (const log of logs) {
          const marketId = log.args.marketId;
          if (!marketId) continue;

          console.log(`Bonding complete for market ${marketId}`);
          await this.handleBondingComplete(marketId);
        }
      },
    });

    // Store unwatch function for cleanup
    return unwatch;
  }

  private async handleBondingComplete(marketId: bigint) {
    try {
      console.log(`Handling bonding complete for market ${marketId}`);

      // Get market details
      const market = await this.getMarketDetails(marketId);
      if (!market) {
        console.error(`Market ${marketId} not found`);
        return;
      }

      // Get debate details
      const debate = await this.getDebateDetails(market.debateId);
      if (!debate) {
        console.error(`Debate ${market.debateId} not found`);
        return;
      }

      // Get gladiators
      const gladiators = await this.getGladiators(marketId);
      if (!gladiators || gladiators.length === 0) {
        console.error(`No gladiators found for market ${marketId}`);
        return;
      }

      // Create Twitter thread
      await this.createTwitterThread(market, gladiators);

    } catch (error) {
      console.error('Error handling bonding complete:', error);
    }
  }

  private async createTwitterThread(market: Market, gladiators: Gladiator[]) {
    try {
      // Create initial tweet with market ID and timestamp
      const timestamp = new Date().toISOString();
      const initialTweetResponse = await this.scraper.sendTweet(
        `🎭 New AI Debate Starting! 🎭\n\nMarket ID: ${market.id}\n\nBonding target reached! The debate will begin shortly.\n\n${timestamp}`
      );

      // Read the response stream
      const reader = initialTweetResponse.body.getReader();
      const decoder = new TextDecoder();
      let tweetData = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        tweetData += decoder.decode(value);
      }

      const initialTweetJson = JSON.parse(tweetData);
      const initialTweetId = initialTweetJson?.data?.create_tweet?.tweet_results?.result?.rest_id;

      if (!initialTweetId) {
        console.error('Failed to get initial tweet ID:', initialTweetJson);
        return;
      }

      console.log('Initial tweet created with ID:', initialTweetId);

      // Create thread introducing gladiators
      let lastTweetId = initialTweetId;
      for (const gladiator of gladiators) {
        const gladTimestamp = new Date().toISOString();
        const gladiatorTweetResponse = await this.scraper.sendTweet(
          `Meet Gladiator ${gladiator.name} (@${gladiator.name})\n\nReady to debate! 🤖\n\n${gladTimestamp}`,
          lastTweetId
        );

        // Read the response stream
        const gladReader = gladiatorTweetResponse.body.getReader();
        let gladTweetData = '';
        
        while (true) {
          const { done, value } = await gladReader.read();
          if (done) break;
          gladTweetData += decoder.decode(value);
        }

        const gladTweetJson = JSON.parse(gladTweetData);
        lastTweetId = gladTweetJson?.data?.create_tweet?.tweet_results?.result?.rest_id;

        if (!lastTweetId) {
          console.error('Failed to get gladiator tweet ID:', gladTweetJson);
          continue;
        }

        // Add a small delay between tweets
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Final tweet with call to action
      const finalTimestamp = new Date().toISOString();
      await this.scraper.sendTweet(
        `Follow this thread to watch these AI gladiators debate in real-time! 🍿\n\nMay the best argument win! 🏆\n\n${finalTimestamp}`,
        lastTweetId
      );

      console.log(`Twitter thread created for market ${market.id}`);
    } catch (error) {
      console.error('Error creating Twitter thread:', error);
    }
  }

  async getMarketDetails(marketId: bigint): Promise<Market | null> {
    try {
      console.log(`Getting market details for market ${marketId}`);
      const data = await this.publicClient.readContract({
        address: MARKET_FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: 'getMarketDetails',
        args: [marketId]
      });

      if (!data) {
        console.error('No market data returned');
        return null;
      }

      // Add type checking and proper conversion
      const [token, debateId, resolved, winningGladiator, bondingCurve, totalBondingAmount, judgeAI, currentRound] = data as any[];
      
      return {
        id: marketId,
        token,
        debateId: BigInt(debateId || 0),
        resolved,
        judgeAI: judgeAI || '',
        winningGladiator: BigInt(winningGladiator || 0),
        bondingCurve: {
          target: BigInt(bondingCurve?.target || 0),
          current: BigInt(bondingCurve?.current || 0),
          basePrice: BigInt(bondingCurve?.basePrice || 0),
          currentPrice: BigInt(bondingCurve?.currentPrice || 0),
          isFulfilled: bondingCurve?.isFulfilled || false,
          endTime: BigInt(bondingCurve?.endTime || 0)
        },
        totalBondingAmount: BigInt(totalBondingAmount || 0),
        currentRound: BigInt(currentRound || 0),
        gladiators: []
      };
    } catch (error) {
      console.error('Error getting market details:', error);
      return null;
    }
  }

  async getDebateDetails(debateId: bigint): Promise<Debate | null> {
    const data = await this.publicClient.readContract({
      address: DEBATE_FACTORY_ADDRESS,
      abi: DEBATE_FACTORY_ABI,
      functionName: 'getDebateDetails',
      args: [debateId]
    });
    return data as Debate;
  }

  async getActiveMarkets(): Promise<Market[]> {
    const data = await this.publicClient.readContract({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      functionName: 'getActiveMarkets',
      args: []
    });
    return data as Market[];
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

  async getGladiators(marketId: bigint): Promise<Gladiator[]> {
    try {
      console.log(`Getting gladiators for market ${marketId}`);
      const data = await this.publicClient.readContract({
        address: MARKET_FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: 'getGladiators',
        args: [marketId]
      });

      if (!data || !Array.isArray(data)) {
        console.error('No gladiator data returned or invalid format');
        return [];
      }

      return data.map((gladiator: any) => ({
        aiAddress: gladiator.aiAddress || '',
        name: gladiator.name || '',
        index: BigInt(gladiator.index || 0),
        isActive: gladiator.isActive || false,
        publicKey: gladiator.publicKey || ''
      }));
    } catch (error) {
      console.error('Error getting gladiators:', error);
      return [];
    }
  }

  async getRoundVerdict(marketId: bigint, roundIndex: number) {
    const data = await this.publicClient.readContract({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      functionName: 'getRoundVerdict',
      args: [marketId, roundIndex]
    });

    return {
      scores: data[0] as bigint[],
      timestamp: data[1] as bigint
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