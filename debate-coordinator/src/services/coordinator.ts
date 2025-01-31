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
import { WebSocketServer, WebSocket } from 'ws';
import { Message } from '../types/message';
import { v4 as uuid } from "uuid";
import { decryptMessage, generateKeyPair } from '../helpers/crypto';
import crypto from "crypto";
import fs from "fs";
import path from "path";

export class CoordinatorService {
  private db: RedisService;
  private publicClient;
  private wsClient;
  private scraper: Scraper;
  private chatService: ChatService;
  private agentClient: AgentClient;
  private wss: WebSocketServer;
  // frontend connections to listen for the chats
  private chatConnections: Map<string, Set<WebSocket>>;
  private privateKey: crypto.KeyObject;
  private publicKey: crypto.KeyObject;

  /////////////////////
  // General methods // 
  /////////////////////

  constructor() {
    if (!process.env.RPC_URL) throw new Error('RPC_URL environment variable is not set');
    if (!process.env.WSS_RPC_URL) throw new Error('WSS_RPC_URL environment variable is not set');

    this.db = new RedisService();
    this.agentClient = new AgentClient();
    this.wss = new WebSocketServer({ port: Number(process.env.WS_PORT) || 3004 });
    this.chatConnections = new Map();
    this.chatService = new ChatService(
      this.db,
      this.agentClient,
      this.broadcastChatMessage.bind(this)
    );

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

    // Set up WebSocket connection handler
    // for frontend to connect.
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      const marketId = req.url?.split('/').pop();
      if (!marketId) {
        ws.close();
        return;
      }

      // Add to connections for this market
      if (!this.chatConnections.has(marketId)) {
        this.chatConnections.set(marketId, new Set());
      }
      this.chatConnections.get(marketId)?.add(ws);

      // Handle client disconnect
      ws.on('close', () => {
        this.chatConnections.get(marketId)?.delete(ws);
        if (this.chatConnections.get(marketId)?.size === 0) {
          this.chatConnections.delete(marketId);
        }
      });
    });

    // Store a key-pair: public for others to encode locations that will be decode-able by the private key
    const { privateKey, publicKey } = generateKeyPair();
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  async initialize() {
    try {
      // Connect to Redis only if not already connected
      const status = await this.db.status();
      if (!status || status === 'wait') {
        await this.db.connect();
      }
      // await this.scraper.login(process.env.TWITTER_USERNAME!, process.env.TWITTER_PASSWORD!)
      // await this.handleBondingComplete(BigInt(5))
      // FIXME: uncomment 2 below
      // await this.startEventListening();
      // await this.startListeningRounds();
      this.db.removeAll()

      // Register agent servers from environment variables
      const gladiators = this.getTestingAgents().filter((agent) => agent.name !== "marcus_aiurelius");
      gladiators.map(gladiator => {
        this.agentClient.registerAgent(gladiator.agentId, gladiator.ipAddress);
        console.log(`Registered agent ${gladiator.name}, with agentId ${gladiator.agentId} at ${gladiator.ipAddress}`)
      })
      const judge = this.getTestingAgents().filter((agent) => agent.name === "marcus_aiurelius").pop();
      this.agentClient.registerAgent(judge.agentId, judge.ipAddress);
      console.log(`Registered judge ${judge.name}, with agentId ${judge.agentId} at ${judge.ipAddress}`)

      // FIXME: remove, used for testing, forcing the marketId to be 0
      await this.createDebateChatRoom(BigInt(0)); // this just sends the notification that one joined
      await this.startDebateDiscussion(BigInt(0));
    } catch (error) {
      console.error('Error during initialization:', error);
      throw error;
    }
  }

  async cleanup() {
    this.db.disconnect();
    await this.wsClient.destroy();
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
  }

  ////////////////////////////////////
  // Chat room management functions //
  ////////////////////////////////////

  async createDebateChatRoom(debateId: bigint) {
    try {
      // Create the chat room
      const roomKey = await this.chatService.createChatRoom(debateId);
      console.log(`Created chat room ${roomKey} for debate ${debateId}`);

      // Get market ID from debate ID
      //const marketId = await this.getMarketIdFromDebateId(debateId);
      //if (!marketId) {
      //  throw new Error(`No market found for debate ${debateId}`);
      //}
      // FIXME: remove
      const marketId = BigInt(0);

      // Get gladiators and add them to the room
      //const gladiators = await this.getGladiators(marketId);
      // FIXME: remove
      const gladiators = this.getTestingAgents().filter(v => v.name !== "marcus_aiurelius");
      for (const gladiator of gladiators) {
        await this.chatService.joinChatRoom(
          debateId,
          gladiator.name,
        );
        console.log(`Gladiator ${gladiator.name} joined chat room ${roomKey}`);
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
      //const marketId = await this.getMarketIdFromDebateId(debateId);
      //if (!marketId) {
      //  throw new Error(`No market found for debate ${debateId}`);
      //}

      // Get gladiators
      //const gladiators = await this.getGladiators(marketId);
      //const gladiatorConfigs = gladiators.map(g => ({
      //  name: g.name,
      //  agentId: g.agentId,
      //  index: Number(g.index)
      //}));
      const agents = this.getTestingAgents();
      const gladiators = agents
        .filter(v => v.name !== "marcus_aiurelius")
        .map(gladiator => {
          return { agentId: gladiator.agentId, ipAddress: gladiator.ipAddress, name: gladiator.name }
        });
      const judge = agents
        .filter(v => v.name === "marcus_aiurelius")
        .map(judge => {
          return { agentId: judge.agentId, ipAddress: judge.ipAddress, name: judge.name }
        }).pop();

      // Start the discussion
      await this.chatService.facilitateDebateDiscussion(debateId, gladiators);

      console.log(`\n\n
                  /// - /// - /// - /// - /// - /// 
                  ///     END OF THE DEBATE     ///
                  /// - /// - /// - /// - /// - /// 
                  \n\n`)

      const { verdict: verdict, winner: winnerUuid } = await this.chatService.sendMessagesToJudge(debateId, { judgeAgentId: judge.agentId, judgeIpAddress: judge.ipAddress, judgeName: judge.name });
      console.log(`\n\n\nReceived from > ${judge.name} < the following verdict:\n\t`, verdict);

      const winnerGladiator = gladiators.filter(g => g.agentId === winnerUuid).pop();
      console.log(`\n~~~ The winner thus is ${winnerGladiator.name} ~~~`)
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
          const market = await this.getMarketDetails(marketId);
          // await this.handleBondingComplete(marketId);
          // Create chat room if it doesn't exist and start discussion
          await this.createDebateChatRoom(market.debateId);
          await this.startDebateDiscussion(market.debateId);
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

          // Round complete, send the message to Marcus AIurelius
          //await this.handleRoundEnded(marketId, roundIndex);
          await this.testingHandleRoundEnded(marketId);
        }
      },
    });

    return unwatch;
  }

  /**
   * Listens to the contract emiting the event that an agent's location has been shared.
   * The event contains two arguments: the market's id and the location.
   * The location is encrypted, so the coordinator needs the It's encrypted using the 
   * @returns if the event-watching has stopped
   */
  private async startListeningLocations() {
    const unwatch = await this.wsClient.watchContractEvent({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      eventName: 'LocationShared',
      onLogs: async (logs) => {
        for (const log of logs) {
          // FIXME: similar to above? or do we have the markets or the debate IDs?
          const debateId = log.args.debateId;
          const location = log.args.location;
          if (!debateId || location === undefined) continue;

          const locationDec = this.decodeLocation(location);
          console.log(`Location shared for debate ${debateId}. Agent is at ${locationDec}`);

          const market = await this.getMarketDetails(debateId);
          if (!market) continue;

          // Join the agent at the location into the debate.
          // TODO: join the agent
        }
      },
    });

    return unwatch;
  }

  /**
   * @param location - the location encoded with the public key
   * @returns the decoded string representing the location
   */
  private decodeLocation(location: string) {
    const decryptedLocation = decryptMessage(location, this.privateKey);
    return decryptedLocation
  }

  /**
   * @returns the public key for the coordinator for others to encrypt.
   */
  getPublicKey() {
    return this.publicKey
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

  private async handleRoundEnded(marketId: bigint, roundIndex: number) {
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

      /// Call Marcus AIurelius to the debate
      const judge = await this.getJudge(marketId);
      await this.chatService.joinChatRoom(
        market.debateId,
        judge.name,
      );

      // Announce the entrance
      const enterMessage = "Marcus AIurelius has joined the chat and will judge your debate, selecting one winner among all.";
      this.chatService.sendMessage(market.debateId, "God", enterMessage);
      // Use the chat to pàss everything to the judge
      // FIXME: see how to store the judge since it's universal for all debates
      //this.chatService.sendMessagesToJudge(market.debateId);
    } catch (error) {
      console.error('Error handling round ended:', error);
    }
  }

  private async testingHandleRoundEnded(roomId: string) {
    try {
      // Get debate details
      const debateId = BigInt(0)

      // Get gladiators and judge
      const agents = this.getTestingAgents();
      const judge = agents.filter((v) => v.name == "marcus_aiurelius").pop();

      /// Call Marcus AIurelius to the debate
      await this.chatService.joinChatRoom(debateId, judge.name);

      // Announce the entrance
      const enterMessage = "Marcus AIurelius has joined the chat and will judge your debate, selecting one winner among all.";
      console.log("** Finished the debate, sending the debate to the judge and waiting for a verdict...")
      await this.chatService.sendMessage(debateId, "system", enterMessage);
      // Use the chat to pàss everything to the judge
      await this.chatService.sendMessagesToJudge(debateId, { judgeIpAddress: judge.ipAddress, judgeAgentId: judge.agentId, judgeName: judge.name });
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

  async getJudge(marketId: bigint): Promise<Gladiator> {
    const data = await this.publicClient.readContract({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      // TODO: should we have this on the contract?
      functionName: 'getJudge',
      args: [marketId]
    });

    if (!data) {
      console.error('No judge data returned');
      return;
    }

    const judge = {
      ipAddress: data.ipAddress || '',
      name: data.name || 'marcus_aiurelius',
      index: BigInt(data.index || 0),
      isActive: data.isActive || false,
      publicKey: data.publicKey || ''
    } as Gladiator;

    return judge
  }

  /**
   * @param agentFolderPath - the location of the information registry
   * @param agentName - the gladiator's name
   * @returns the uuid (agentId) of the gladiator
   */
  readAgentId(agentFolderPath: string, agentName: string) {
    const pathToAgent = path.join(agentFolderPath, agentName);
    const content = fs.readFileSync(pathToAgent, { encoding: "utf8" });
    return content;
  }

  /**
   * @returns a collection of agents running locally
   */
  getTestingAgents() {
    // Read the filenames from the info registry:
    // the filename is the agent's name (and the contents are the uuid)
    const localAgentsFolder = path.join(__dirname, "../../../debate-agent/characters/agent-information/");
    const localAgents = fs.readdirSync(localAgentsFolder);
    const localAddress = "http://localhost:3000";

    // construct the agents by reading the uuid and using the filename as agent name
    const runningAgents = localAgents.map((agent: string, idx: number) => {
      const gladiator = {
        ipAddress: localAddress,
        name: agent,
        agentId: this.readAgentId(localAgentsFolder, agent),
        index: BigInt(idx),
        isActive: true,
        publicKey: ''
      };
      return gladiator as Gladiator;
    });

    return runningAgents;
  }

  /**
   * @param marketId - from which market to fetch the gladiators from.
   */
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
        ipAddress: gladiator.ipAddress || '',
        name: gladiator.name || '',
        index: BigInt(gladiator.index || 0),
        isActive: gladiator.isActive || false,
        publicKey: gladiator.publicKey || ''
      } as Gladiator));
    } catch (error) {
      console.error('Error getting gladiators:', error);
      return [];
    }
  }

  // Add method to broadcast chat messages
  private broadcastChatMessage(marketId: string, message: Message) {
    const connections = this.chatConnections.get(marketId);
    if (connections) {
      const messageStr = JSON.stringify(message);
      connections.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
    }
  }

  // Add method to get chat messages
  async getChatMessages(marketId: bigint): Promise<Message[]> {
    try {
      // Get debate ID from market ID
      const market = await this.getMarketDetails(marketId);
      if (!market) {
        throw new Error(`No market found for ID ${marketId}`);
      }

      // Get messages from chat service
      return await this.chatService.getMessages(market.debateId);
    } catch (error) {
      console.error('Error getting chat messages:', error);
      return [];
    }
  }
}
