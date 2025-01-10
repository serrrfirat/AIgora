import { ModelProviderName } from '@elizaos/core';
import { convertToOneLine, replaceAgentValues, lc, createOrUpdateJsonFile, AgentData, defaultTwitterTemplate } from './helpers';
import { systemPrompt } from './prompts';

/** Creates or updates the JSON file for a gladiator.
 *
 * @param name - gladiator name
 * @param systemPrompt - system prompt needed for the model
 * @param template - template for the gladiator behaviour
 * @returns the data needed for the gladiator
 */
export function generateOrUpdateGladiatorData(agentName: string, agentRole: string, agentPersonality: string) {
	const replacedSystemPrompt = replaceAgentValues(systemPrompt, agentName, agentRole, agentPersonality);
	const systemPromptOneLine = convertToOneLine(replacedSystemPrompt);

	const templateData: AgentData = {
		name: agentName,
		system: systemPromptOneLine,
		template: defaultTwitterTemplate,
	}

	const fullAgent = {
		...templateData,
		modelProvider: ModelProviderName.OPENAI,
		bio: [agentRole, agentPersonality],
		lore: ["previous gladiator fighting in the Colisseum turned debate-champion from their city"],
		messageExamples: [
			[
				{
					"user": "{{user1}}",
					"content": {
						"text": "What's your stance on abortion?"
					}
				},
				{
					"user": "Spartacus",
					"content": {
						"text": "Everyone should have the right to abort."
					}
				}
			],
		],
		postExamples: [
			"Read a book, you stupid fool",
		],
		topics: ["politics", "democracy", ""],
		adjectives: ["passionate", "creative"],
		clients: ["direct"],
		plugins: [],
		style: { all: ["informal"], chat: ["lengthy"], post: ["concise"] },
		settings: { model: "gpt-o1-mini" },
	}

	const filePath = `./characters/${lc(agentName)}.character.json`;

	createOrUpdateJsonFile(filePath, fullAgent);
}

