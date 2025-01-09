import Redis from 'ioredis';
import { Message } from '../types/message';
import { RedisService } from './redis';
import { AgentClient } from './agent-client';

export class ChatService {
  private redis: RedisService   ;
  private agentClient: AgentClient;

  constructor(redis: RedisService, agentClient: AgentClient) {
    this.redis = redis;
    this.agentClient = agentClient;
  }

  private getChatRoomKey(debateId: bigint): string {
    return `chat:${debateId}`;
  }

  async createChatRoom(debateId: bigint): Promise<void> {
    const key = this.getChatRoomKey(debateId);
    const systemMessage: Message = {
      sender: 'system',
      content: 'Chat room created',
      timestamp: new Date().toISOString()
    };
    await this.redis.client.rpush(key, JSON.stringify(systemMessage));
  }

  async joinChatRoom(debateId: bigint, gladiatorName: string): Promise<void> {
    const key = this.getChatRoomKey(debateId);
    const joinMessage: Message = {
      sender: 'system',
      content: `${gladiatorName} has joined the chat`,
      timestamp: new Date().toISOString()
    };
    await this.redis.client.rpush(key, JSON.stringify(joinMessage));
  }

  async sendMessage(debateId: bigint, sender: string, content: string): Promise<void> {
    const key = this.getChatRoomKey(debateId);
    const message: Message = {
      sender,
      content,
      timestamp: new Date().toISOString()
    };
    await this.redis.client.rpush(key, JSON.stringify(message));
  }

    async getMessages(debateId: bigint): Promise<Message[]> {
    const key = this.getChatRoomKey(debateId);
    const messages = await this.redis.client.lrange(key, 0, -1);
    return messages.map(msg => JSON.parse(msg));
  }

  async getChatHistory(debateId: bigint): Promise<Message[]> {
    return this.getMessages(debateId);
  }

  async facilitateDebateDiscussion(
    debateId: bigint,
    gladiators: { name: string; agentId: string; index: number }[]
  ): Promise<void> {
    let currentSpeakerIndex = 0;

    while (true) {
      const currentGladiator = gladiators[currentSpeakerIndex];
      
      // Get last message
      const messages = await this.getMessages(debateId);
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage) {
        // Send to current gladiator's agent server
        const response = await this.agentClient.sendMessage(
          currentGladiator.agentId,
          {
            roomId: `debate-${debateId}`,
            userId: currentGladiator.name,
            text: lastMessage.content
          }
        );

        // Send response back to chat
        await this.sendMessage(debateId, currentGladiator.name, response);
      }

      // Move to next gladiator
      currentSpeakerIndex = (currentSpeakerIndex + 1) % gladiators.length;

      // Add delay between messages
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
} 
