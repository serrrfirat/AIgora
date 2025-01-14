import { AgentRuntime } from "@elizaos/core";

export class Judge {
	name: string;
	description: string
	agent: AgentRuntime;

	constructor(name: string, description: string) {
		this.name = name;
		this.description = description;
		this.agent = new AgentRuntime({ name: name, description: description });
	}

	async connectRoom(roomId: string) {
		// handle messages
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


const judge = new AgentRuntime({
	name: "marcusAIurelius",
	description: "The emperor who will decide which gladiator is the winner."
});

judge.connectRoom(0);

