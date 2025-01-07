import { convertToOneLine, replaceAgentValues, lc, createOrUpdateJsonFile, AgentData, defaultTwitterTemplate } from './helpers';
import { systemPrompt } from './prompts';

/** Creates or updates the JSON file for a gladiator.
 *
 * @param name - gladiator name
 * @param systemPrompt - system prompt needed for the model
 * @param template - template for the gladiator behaviour
 * @returns the data needed for the gladiator
 */
export function generateGladiatorData(agentName: string, agentRole: string, agentPersonality: string) {
	const replacedSystemPrompt = replaceAgentValues(systemPrompt, agentName, agentRole, agentPersonality);
	const systemPromptOneLine = convertToOneLine(replacedSystemPrompt);

	const newData: AgentData = {
		name: agentName,
		system: systemPromptOneLine,
		template: defaultTwitterTemplate,
	}

	const filePath = `./characters/${lc(agentName)}.character.json`;

	createOrUpdateJsonFile(filePath, newData);
}

