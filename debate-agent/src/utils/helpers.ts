import fs from 'fs';
import { continueMessageHandlerTemplate, evaluationTemplate, factsTemplate, goalsTemplate, shouldRespondTemplate, twitterActionTemplate, twitterMessageHandlerTemplate, twitterPostTemplate, twitterSearchTemplate, twitterShouldRespondTemplate } from './templates.ts';
import { messageHandlerTemplate } from '@ai16z/client-direct';

/**
 * Template interface for what's needed for the Twitter agent.
 */
export interface TwitterTemplate {
	goalsTemplate: string,
	factsTemplate: string,
	messageHandlerTemplate: string,
	shouldRespondTemplate: string,
	continueMessageHandlerTemplate: string,
	evaluationTemplate: string,
	twitterSearchTemplate: string,
	twitterPostTemplate: string,
	twitterActionTemplate: string,
	twitterMessageHandlerTemplate: string,
	twitterShouldRespondTemplate: string,
}

export const defaultTwitterTemplate: TwitterTemplate = {
	goalsTemplate: convertToOneLine(goalsTemplate),
	factsTemplate: convertToOneLine(factsTemplate),
	messageHandlerTemplate: convertToOneLine(messageHandlerTemplate),
	shouldRespondTemplate: convertToOneLine(shouldRespondTemplate),
	continueMessageHandlerTemplate: convertToOneLine(continueMessageHandlerTemplate),
	evaluationTemplate: convertToOneLine(evaluationTemplate),
	twitterSearchTemplate: convertToOneLine(twitterSearchTemplate),
	twitterPostTemplate: convertToOneLine(twitterPostTemplate),
	twitterActionTemplate: convertToOneLine(twitterActionTemplate),
	twitterMessageHandlerTemplate: convertToOneLine(twitterMessageHandlerTemplate),
	// FIXME: correct handlers + MarcusAIurelius
	twitterShouldRespondTemplate: convertToOneLine(twitterShouldRespondTemplate("@Gladiator1,@Gladiator2,@Gladiator3")),
};

/**
 * JSON object storing the data for the agent. Basically here so the compiler doesn't yell.
 */
export interface AgentData {
	name: string,
	system: string,
	template: TwitterTemplate,
}

/**
 * @param text - multiline string to be converted into one line.
 * @returns a string without linebreaks
 */
export function convertToOneLine(text: string): string {
	return text
		.replace(/\r\n|\r|\n/g, '\\n')
		.replace(/"/g, '\\"')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * @param text - multiline text with placeholders to be replaced.
 * @param agentName - name of the agent
 * @param agentRole - the role of the agent
 * @param agentPersonality - the adjectives describing the agent
 * @returns same multiline text without placeholders
 */
export function replaceAgentValues(text: string, agentName: string, agentRole: string, agentPersonality: string): string {
	return text
		.replace(/{{AGENT_NAME}}/g, agentName)
		.replace(/{{AGENT_ROLE}}/g, agentRole)
		.replace(/{{AGENT_PERSONALITY}}/g, agentPersonality);
}

/**
 * @param str - string to be converted to lowercase
 * @returns lowercased string
 */
export function lc(str: string): string {
	return str.toLowerCase();
}


/**
 * Load a character from its JSON file.
 *
 * @param filePath - the path to the JSON file
 */
export function loadCharacter(filePath: fs.PathLike): AgentData {
	let existingData = {} as AgentData;

	if (fs.existsSync(filePath)) {
		const fileContent = fs.readFileSync(filePath, 'utf-8');
		existingData = JSON.parse(fileContent);
		console.log("Existing character found. Updating...");
	} else {
		console.log("No existing character found...");
	}

	return existingData;
}

/** Create or update a JSON object
 *
 * @param filePath - the path to the JSON
 * @param newData - the new JSON object
 */
export function createOrUpdateJsonFile(filePath: fs.PathLike, newData: AgentData) {
	let existingData = loadCharacter(filePath);

	// Merge existing data with new data
	const updatedData = {
		...existingData,
		...newData,
		template: {
			...existingData.template,
			...newData.template
		}
	};

	// Convert JSON object to string
	const jsonString = JSON.stringify(updatedData, null, 2);

	// Write to file
	if (!fs.existsSync("characters/")) {
		console.log("Creating characters directory...");
		fs.mkdirSync("characters/");
	}
	fs.writeFileSync(filePath, jsonString);

	console.log(`JSON file '${filePath}' has been ${fs.existsSync(filePath) ? 'updated' : 'created'} successfully.`);
}


/**
 * Combines two objects into a new one, keepeing fields from both.
 */
export function combineObjects<T extends object, U extends object>(obj1: T, obj2: U): T & U {
	return { ...obj1, ...obj2 };
}

