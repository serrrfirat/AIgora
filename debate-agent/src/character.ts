import { AgentData, loadCharacter, combineObjects } from "./utils/helpers.ts";
import { Character, defaultCharacter } from "@ai16z/eliza";

const loadedCharacter: AgentData = loadCharacter("characters/character.json");
//const defaultChar: Character = {
//	settings: {
//		secrets: {
//			"OPENAI_API_KEY": "..."
//		}
//	},
//	...defaultCharacter
//};
const defaultChar: Character = defaultCharacter;

export const character: Character = combineObjects(defaultChar, loadedCharacter);

