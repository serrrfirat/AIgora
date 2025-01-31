import { RedisService } from './redis';
import { Message } from '../types/message';
import { AgentClient } from './agent-client';
import { v4 as uuid } from 'uuid';

export class ChatService {
  private dbService: RedisService;
  private agentClient: AgentClient;
  private onMessage: (marketId: string, message: Message) => void;

  constructor(
    redisService: RedisService,
    agentClient: AgentClient,
    onMessage: (marketId: string, message: Message) => void
  ) {
    this.dbService = redisService;
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
    return await this.dbService.get(this.getDebateToRoomKey(debateId));
  }

  private async getDebateIdByRoomId(roomId: string): Promise<bigint | null> {
    const debateIdStr = await this.dbService.get(this.getRoomToDebateKey(roomId));
    return debateIdStr ? BigInt(debateIdStr) : null;
  }

  private async mapRoomToDebate(roomId: string, debateId: bigint): Promise<void> {
    // Store bidirectional mapping
    await this.dbService.set(this.getDebateToRoomKey(debateId), roomId);
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
    await this.dbService.rpush(roomId, JSON.stringify(systemMessage));
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
    await this.dbService.rpush(roomId, JSON.stringify(joinMessage));
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
    await this.dbService.rpush(roomId, JSON.stringify(joinMessage));
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
    await this.dbService.rpush(roomId, JSON.stringify(message));
    this.onMessage(debateId.toString(), message);
  }

  async getMessages(debateId: bigint): Promise<Message[]> {
    const roomId = await this.getRoomIdByDebateId(debateId);
    if (!roomId) {
      console.log(`No chat room found for debate ${debateId}`);
      return [];
    }
    const messages = await this.dbService.lrange(roomId, 0, -1);
    return messages.map(msg => JSON.parse(msg));
  }

  async getChatHistory(debateId: bigint): Promise<Message[]> {
    return this.getMessages(debateId);
  }

  async facilitateDebateDiscussion(
    debateId: bigint,
    gladiators: { agentId: string; ipAddress: string; name: string }[]
  ): Promise<{ roomId: string, round: number }> {
    // Get room ID for this debate
    const roomId = await this.getRoomIdByDebateId(debateId);
    if (!roomId) {
      throw new Error(`No chat room found for debate ${debateId}`);
    }

    // messages for sending at the beginning.
    const greetings = 'Welcome to the debate! You must convince the judge (Marcus AIurelius) of your position. Present your arguments clearly and engage with other participants respectfully.';
    const theme = "TAXES".toUpperCase();
    const initialMessage = `${greetings}. The theme will be: ${theme}. The gladiator starting the debate will be you, ${gladiators[0].name}. First state your name, come up with 4 points in favour or against the theme, and then expose some of your arguments, so other gladiators can answer you! Keep exposing your points and refute the arguments of other gladiators throughout the debate!`;

    // Send initial context message
    await this.sendMessage(debateId, 'system', initialMessage);
    console.log(`\n\nSending to > ${gladiators[0].name} < the initial message:\n\t${initialMessage}`);

    let currentSpeakerIndex = 0;
    let count = 0;

    while (true) {
      const currentGladiator = gladiators[currentSpeakerIndex];
      const mappedAgentId = currentGladiator.agentId;

      if (!mappedAgentId) {
        console.error(`No agentId (${currentGladiator.agentId}) mapping found for address ${currentGladiator.ipAddress}`);
        currentSpeakerIndex = (currentSpeakerIndex + 1) % gladiators.length;
        continue;
      }

      // Moderator can keep the debate alive if the agents get stuck. 
      // Careful: Sometimes it works the other way around and makes them fall in a loop.
      //await this.keepDebateAlive(count, debateId);

      // Get last message
      const messages = await this.getMessages(debateId);
      const lastMessage = messages[messages.length - 1];

      if (lastMessage) {
        try {
          //console.log(`Sending to > ${currentGladiator.name} < the message:\n\t${lastMessage.content}`);

          // Send to current gladiator's agent server
          const response = await this.agentClient.sendMessage(
            {
              ipAddress: currentGladiator.ipAddress,
              agentId: currentGladiator.agentId
            },
            {
              roomId: roomId,
              userId: currentGladiator.agentId,
              text: lastMessage.content
            }
          );
          console.log(`\nReceived from > ${currentGladiator.name} < a response:\n\t`, response);

          // Send response back to chat
          await this.sendMessage(debateId, currentGladiator.agentId, response);
        } catch (error) {
          console.error(`Error communicating with agent ${currentGladiator.agentId}:`, error);
        }
      } else {
        console.log("there was no last message");
      }

      // Move to next gladiator
      currentSpeakerIndex = (currentSpeakerIndex + 1) % gladiators.length;
      count++;

      // Add delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (count == 5) {
        return { roomId: roomId, round: count };
      }
    }
  }


  /**
   * @param count - Every certain number of rounds, send a message so the agents don't get stuck. It has to be a multiplo of the number of gladiators, otherwise the "if" is never going to be true.
   * @param debateId - The debate to send the message
   * @param speakerIndex - Only send a message when all the agents have talked (this is 0)
   * @returns the updated counter
   */
  async keepDebateAlive(count: number, debateId: bigint): Promise<number> {
    if (count % 2 == 0 && count != 0) {
      const message = "There have been some really good points from all the parts involved in the debate. Keep the debate alive by exposing more points and refuting the positions of the other gladiators.";
      console.log("\n** Sending message as > system < to keep debate alive:", message)
      await this.sendMessage(debateId, 'system', message);
      count = 0;
      return count
    }
    return count
  }

  /**
   * @param debateId - the debate in which the judge will decide the winner
   */
  async sendMessagesToJudge(debateId: bigint, location: { judgeIpAddress: string, judgeAgentId: string, judgeName: string }): Promise<{ verdict: string, winner: string }> {
    // Get room ID for this debate
    const roomId = await this.getRoomIdByDebateId(debateId);
    if (!roomId) {
      throw new Error(`No chat room found for debate ${debateId}`);
    }

    // notify about the chunking
    await this.agentClient.sendMessage(
      {
        ipAddress: location.judgeIpAddress,
        agentId: location.judgeAgentId,
      },
      {
        roomId: roomId,
        userId: location.judgeName,
        text: `You are going to receive the messages from the debate. Process them without answering UNTIL I tell you to decide the winner.`,
      }
    )

    // Get all the messages
    const messages = await this.getMessages(debateId);
    const filteredMessages = messages.filter(v => v.sender !== "system")

    // If the debate is too long, the tokens might not fit the model, 
    // and the messages have to be seaprated into chunks or by sender. 
    // There are some helpers down below
    await this.agentClient.sendMessage(
      {
        ipAddress: location.judgeIpAddress,
        agentId: location.judgeAgentId,
      },
      {
        roomId: roomId,
        userId: location.judgeName,
        text: `These are messages from the debate.\n\n${JSON.stringify(filteredMessages)}`,
      }
    )

    // Ask for a verdict
    const verdict = await this.agentClient.sendMessage(
      {
        ipAddress: location.judgeIpAddress,
        agentId: location.judgeAgentId,
      },
      {
        roomId: roomId,
        userId: location.judgeName,
        text: `You have received all the messages from the gladiators. Select a winner among the participants. Analyse them to find who was a better orator, who explained their points cleverly and who refuted others in an astute way. Explain why you chose them.`,
      }
    )

    // Force the judge to return the winner in the correct format.
    const regex = /\{winner:\s*'([^']+)'\}/;
    const winnerUuid = await this.forceFormattedWinner(location, roomId, regex)

    return { verdict: verdict, winner: winnerUuid };
  }

  /**
   * Force the judge to return a JSON format so we can extract the UUID.
   * CAUTION: this loops, so if nothing happens, this might be the cause.
   *
   * @param location - where the judge is
   * @param roomId - the room the debate is being held
   * @param regex - the regex to extract the winner
   */
  async forceFormattedWinner(location: any, roomId: any, regex: any): Promise<string> {
    const winner = await this.agentClient.sendMessage(
      {
        ipAddress: location.judgeIpAddress,
        agentId: location.judgeAgentId,
      },
      {
        roomId: roomId,
        userId: location.judgeName,
        text: `Format the winner as the following JSON format "{winner: 'WINNER'}", where WINNER is the message sender of the debate's winner.`,
      }
    )

    // match[0] is the full matched string: e.g., "{winner: 'Alice the Champion'}"
    // match[1] is the capturing group: e.g., "Alice the Champion"
    const match = winner.match(regex);

    if (match) {
      return match[1]
    } else {
      await this.forceFormattedWinner(location, roomId, regex)
    }
  }

  /**
   * The models sometimes have a maximum of tokens we can feed.
   * Separating by gladiator sometimes help.
   *
   * @param messages - the collection of all the messages
   * @returns the same collection but separated by gladiators
   */
  groupMessagesBySender(messages: Message[]): Record<string, Set<string>> {
    let cleanedMessages = {};
    for (const msg of messages) {
      if (msg.sender === "system") {
        continue;
      }
      if (!cleanedMessages[msg.sender]) {
        cleanedMessages[msg.sender] = new Set<string>();
      } else {
        cleanedMessages[msg.sender].add(msg.content);
      };
    }
    return cleanedMessages;
  }

  /**
   * Splits an array into chunks of the specified size.
   *
   * @param array - The original array to split.
   * @param chunkSize - The maximum size of each chunk.
   * @returns An array of subarrays (chunks).
   */
  chunkMessages<T>(array: T[], chunkSize: number): T[][] {
    const result: T[][] = [];

    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);
      result.push(chunk);
    }

    return result;
  }
}

