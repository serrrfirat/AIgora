import { RedisService } from './redis';
import { Market, Round, Gladiator, Debate } from '../types/market';
import { AgentMessage } from '../types/agent';
import { createPublicClient, createWalletClient, http, webSocket } from 'viem';
import { DEBATE_FACTORY_ABI, DEBATE_FACTORY_ADDRESS, MARKET_FACTORY_ABI, MARKET_FACTORY_ADDRESS } from './contracts';
import { holesky } from 'viem/chains';
import { TwitterApi } from 'twitter-api-v2';
import { ChatService } from './chat';
import { AgentClient } from './agent-client';
import { Scraper } from 'agent-twitter-client';

export class CoordinatorService {
  private redis: RedisService;
  private publicClient;
  private wsClient;
  private scraper: Scraper;
  private chatService: ChatService;
  private agentClient: AgentClient;

  constructor() {
    if (!process.env.RPC_URL) throw new Error('RPC_URL environment variable is not set');
    if (!process.env.WSS_RPC_URL) throw new Error('WSS_RPC_URL environment variable is not set');

    this.redis = new RedisService();
    this.agentClient = new AgentClient();
    this.chatService = new ChatService(this.redis, this.agentClient);
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
    // await this.handleBondingComplete(BigInt(5))
    await this.startEventListening();
    await this.startListeningRounds();

    // Register agent servers from environment variables
    const agentServers = process.env.AGENT_SERVERS ? JSON.parse(process.env.AGENT_SERVERS) : {};
    for (const [agentId, url] of Object.entries(agentServers)) {
      this.agentClient.registerAgent(agentId, url as string);
    }
  }

  async cleanup() {
    await this.redis.disconnect();
    await this.wsClient.destroy();
  }

  // Chat room management functions
  async createDebateChatRoom(debateId: bigint) {
    try {
      // Create the chat room
      const roomKey = await this.chatService.createChatRoom(debateId);
      console.log(`Created chat room ${roomKey} for debate ${debateId}`);

      // Get market ID from debate ID
      const marketId = await this.getMarketIdFromDebateId(debateId);
      if (!marketId) {
        throw new Error(`No market found for debate ${debateId}`);
      }

      // Get gladiators and add them to the room
      const gladiators = await this.getGladiators(marketId);
      for (const gladiator of gladiators) {
        await this.chatService.joinChatRoom(
          debateId,
          gladiator.name,
        );
        console.log(`Added gladiator ${gladiator.name} to chat room ${roomKey}`);
      }

      return roomKey;
    } catch (error) {
      console.error('Error creating debate chat room:', error);
      throw error;
    }
  }

  async startDebateDiscussion(debateId: bigint) {
    try {
      // Get market ID from debate ID
      const marketId = await this.getMarketIdFromDebateId(debateId);
      if (!marketId) {
        throw new Error(`No market found for debate ${debateId}`);
      }

      // Get gladiators
      const gladiators = await this.getGladiators(marketId);
      const gladiatorConfigs = gladiators.map(g => ({
        name: g.name,
        agentId: g.aiAddress,
        index: Number(g.index)
      }));

      // Start the discussion
      await this.chatService.facilitateDebateDiscussion(debateId, gladiatorConfigs);
    } catch (error) {
      console.error('Error starting debate discussion:', error);
      throw error;
    }
  }

  private async getMarketIdFromDebateId(debateId: bigint): Promise<bigint | null> {
    try {
      const marketId = await this.publicClient.readContract({
        address: MARKET_FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: 'debateIdToMarketId',
        args: [debateId]
      });
      return marketId as bigint;
    } catch (error) {
      console.error('Error getting market ID from debate ID:', error);
      return null;
    }
  }

  // Keep existing event listening and handling functions
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

    return unwatch;
  }

  private async startListeningRounds() {
    const unwatch = await this.wsClient.watchContractEvent({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      eventName: 'RoundStarted',
      onLogs: async (logs) => {
        for (const log of logs) {
          const marketId = log.args.marketId;
          const roundIndex = log.args.roundIndex;
          if (!marketId || roundIndex === undefined) continue;

          console.log(`Round started for market ${marketId}, round ${roundIndex}`);
          
          // Get debate ID
          const market = await this.getMarketDetails(marketId);
          if (!market) continue;

          // Create chat room if it doesn't exist and start discussion
          await this.createDebateChatRoom(market.debateId);
          await this.startDebateDiscussion(market.debateId);
        }
      },
    });

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
      await this.createTwitterThread(debate, market, gladiators);

    } catch (error) {
      console.error('Error handling bonding complete:', error);
    }
  }

  private async handleRoundEnded(marketId: bigint, roundIndex: number){
    try {
      console.log(`Handling round ended for market ${marketId} and round ${roundIndex}`);

    const round = await this.getCurrentRound(marketId);
    if (!round) {
      console.error(`Round ${roundIndex} not found for market ${marketId}`);
      return;
    }
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
    /// Call Marcus AIrelius to the thread
    const marcusRequest = await this.scraper.sendTweet(`Marcus AIrelius, the judge, please deliver the verdict of this round. The topic is "${debate.topic}" and the gladiators are ${gladiators.map(g => g.name).join(', ')}. The timestamp is ${round.round.endTime}`);
    } catch (error) {
      console.error('Error handling round ended:', error);
    }
  }

  private async createTwitterThread(debate: Debate, market: Market, gladiators: Gladiator[]) {
    try {
      // Create initial tweet with market ID and timestamp
      const timestamp = new Date().toISOString();
      const initialTweetResponse = await this.scraper.sendTweet(
        `🎭 New AI Debate Starting! The topic is "${debate.topic}" 🎭\n\nMarket ID: ${market.id}\n\nBonding target reached! The debate will begin shortly.\n\n${timestamp}`
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

  // Contract interaction methods
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
}