import { AgentRuntime } from "@elizaos/core";

/**
 * The agent in charge of deciding which gladiator won.
 *
 * To be created, it takes a anme and a description, which will be used
 * to create the runtime.
 *
 * When joining a room, it will get all the messages there and select a winner based on that.
 */
export class Judge {
	name: string;
	description: string
	agent: AgentRuntime;

	/**
	 * @param name - Judge's name. Defaults to Marcus AIurelius
	 * @param description - Judge's description. Defaults to basic action.
	 */
	constructor(name: string = "Marcus AIurelius", description: string = "The emperor who will decide which gladiator is the debate winner.") {
		this.name = name;
		this.description = description;
		this.agent = new AgentRuntime({ name: name, description: description });
	}

	/**
	 * @param roomId - the room where the debate is being held.
	 */
	async joinRoom(roomId: string) {
		// What to do when a message is received
		this.agent.onMessage(async (message: { roomId: string }, context: any) => {
			// Get access to the message memory manager, which is provided through the runtinme, I guess.
			const messageManager = this.agent.getMemoryManager("messages");
			// Retrieve relevant conversation history
			const conversationHistory = await messageManager.getMemories({
				roomId: roomId,
			});
			// Process the message with historical context
			const response = await this.agent.process({
				message,
				context: {
					...context,
					history: conversationHistory
				}
			});
			return response;
		});
	}
}


const judge = new Judge(
	"marcusAIurelius",
	"cracked emperor decides who wins"
);

judge.joinRoom("0");

