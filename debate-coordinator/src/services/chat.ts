import { RedisService } from './redis';
import { Message } from '../types/message';
import { AgentClient } from './agent-client';
import { Redis } from 'ioredis';
import { v4 as uuid } from 'uuid';

export class ChatService {
  private redis: Redis;
  private agentClient: AgentClient;
  private onMessage: (marketId: string, message: Message) => void;

  constructor(
    redis: Redis,
    agentClient: AgentClient,
    onMessage: (marketId: string, message: Message) => void
  ) {
    this.redis = redis;
    this.agentClient = agentClient;
    this.onMessage = onMessage;
  }

  private getDebateToRoomKey(debateId: bigint): string {
    return `debate:${debateId}:roomId`;
  }

  private getRoomToDebateKey(roomId: string): string {
    return `room:${roomId}:debateId`;
  }

  private async getRoomIdByDebateId(debateId: bigint): Promise<string | null> {
    return await this.redis.get(this.getDebateToRoomKey(debateId));
  }

  private async getDebateIdByRoomId(roomId: string): Promise<bigint | null> {
    const debateIdStr = await this.redis.get(this.getRoomToDebateKey(roomId));
    return debateIdStr ? BigInt(debateIdStr) : null;
  }

  private async mapRoomToDebate(roomId: string, debateId: bigint): Promise<void> {
    // Store bidirectional mapping
    await this.redis.set(this.getDebateToRoomKey(debateId), roomId);
    await this.redis.set(this.getRoomToDebateKey(roomId), debateId.toString());
  }

  async createChatRoom(debateId: bigint): Promise<string> {
    // Check if room already exists for this debate
    const existingRoomId = await this.getRoomIdByDebateId(debateId);
    if (existingRoomId) {
      console.log(`Chat room ${existingRoomId} already exists for debate ${debateId}`);
      return existingRoomId;
    }

    // Create new room with random UUID
    const roomId = uuid();
    console.log(`Creating new chat room ${roomId} for debate ${debateId}`);

    // Create bidirectional mapping
    await this.mapRoomToDebate(roomId, debateId);

    const systemMessage: Message = {
      sender: 'system',
      content: 'Chat room created',
      timestamp: new Date().toISOString()
    };

    // Store initial message in room
    await this.redis.rpush(roomId, JSON.stringify(systemMessage));
    this.onMessage(debateId.toString(), systemMessage);

    return roomId;
  }

  /**
   * @param debateId  - Debate identifier
   * @param judgeName - Judge's name
   */
  async joinJudge(debateId: bigint, judgeName: string): Promise<void> {
    let roomId = await this.getRoomIdByDebateId(debateId);
    if (!roomId) {
      console.log(`judge ${judgeName} cannot join room ${roomId} because it does not exist`);
      return;
    }

    const joinMessage: Message = {
      sender: 'system',
      content: `the judge ${judgeName} has joined the chat`,
      timestamp: new Date().toISOString()
    }
    await this.redis.rpush(roomId, JSON.stringify(joinMessage));
    this.onMessage(debateId.toString(), joinMessage);
  }

  async joinChatRoom(debateId: bigint, gladiatorName: string): Promise<void> {
    // Get or create room ID
    let roomId = await this.getRoomIdByDebateId(debateId);
    if (!roomId) {
      roomId = await this.createChatRoom(debateId);
    }

    const joinMessage: Message = {
      sender: 'system',
      content: `${gladiatorName} has joined the chat`,
      timestamp: new Date().toISOString()
    };
    await this.redis.rpush(roomId, JSON.stringify(joinMessage));
    this.onMessage(debateId.toString(), joinMessage);
  }

  async sendMessage(debateId: bigint, sender: string, content: string): Promise<void> {
    // Get or create room ID
    let roomId = await this.getRoomIdByDebateId(debateId);
    if (!roomId) {
      roomId = await this.createChatRoom(debateId);
    }

    const message: Message = {
      sender,
      content,
      timestamp: new Date().toISOString()
    };
    await this.redis.rpush(roomId, JSON.stringify(message));
    this.onMessage(debateId.toString(), message);
  }

  async getMessages(debateId: bigint): Promise<Message[]> {
    const roomId = await this.getRoomIdByDebateId(debateId);
    if (!roomId) {
      console.log(`No chat room found for debate ${debateId}`);
      return [];
    }
    const messages = await this.redis.lrange(roomId, 0, -1);
    return messages.map(msg => JSON.parse(msg));
  }

  async getChatHistory(debateId: bigint): Promise<Message[]> {
    return this.getMessages(debateId);
  }

  async facilitateDebateDiscussion(
    debateId: bigint,
    gladiators: { name: string; agentId: string; index: number }[]
  ): Promise<void> {
    // Get room ID for this debate
    const roomId = await this.getRoomIdByDebateId(debateId);
    if (!roomId) {
      throw new Error(`No chat room found for debate ${debateId}`);
    }

    // Map contract addresses to agent IDs
    const agentMap: { [address: string]: string } = {
      '0x1111111111111111111111111111111111111111': 'socrates',
      '0x2222222222222222222222222222222222222222': 'plato',
      '0x3333333333333333333333333333333333333333': 'aristotle',
      '0x4444444444444444444444444444444444444444': 'marcus_aurelius',
      '0x5555555555555555555555555555555555555555': 'seneca'
    };

    // Send initial context message
    await this.sendMessage(
      debateId,
      'system',
      'Welcome to the debate! You must convince the judge Marcus AIurelius of your position. Present your arguments clearly and engage with other participants respectfully. '
    );

    let currentSpeakerIndex = 0;

    while (true) {
      const currentGladiator = gladiators[currentSpeakerIndex];
      const mappedAgentId = agentMap[currentGladiator.agentId.toLowerCase()];

      if (!mappedAgentId) {
        console.error(`No agent ID mapping found for address ${currentGladiator.agentId}`);
        currentSpeakerIndex = (currentSpeakerIndex + 1) % gladiators.length;
        continue;
      }

      // Get last message
      const messages = await this.getMessages(debateId);
      const lastMessage = messages[messages.length - 1];

      if (lastMessage) {
        try {
          console.log(`Attempting to send message to agent ${currentGladiator.name} (${currentGladiator.agentId}) -> ${mappedAgentId}`);

          const agentId = uuid();
          // Send to current gladiator's agent server
          const response = await this.agentClient.sendMessage(
            // TODO: can we use agentId here? is this `agentMap[currenGladiator.name]`?
            "ebeabd78-5beb-01b2-a37b-38a7b31a8858",
            {
              roomId: roomId,
              userId: currentGladiator.name,
              text: lastMessage.content
            }
          );

          console.log(`Received response from agent ${mappedAgentId}:`, response);

          // Send response back to chat
          await this.sendMessage(debateId, currentGladiator.name, response);
        } catch (error) {
          console.error(`Error communicating with agent ${currentGladiator.name}:`, error);
          console.error('Agent details:', {
            roomId,
            address: currentGladiator.agentId,
            mappedId: agentMap[currentGladiator.agentId.toLowerCase()],
            name: currentGladiator.name
          });
        }
      } else {
        console.log("there was no last message");
      }

      // Move to next gladiator
      currentSpeakerIndex = (currentSpeakerIndex + 1) % gladiators.length;

      // Add delay between messages
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
} 
