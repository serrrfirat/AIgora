import { AgentData, loadCharacter, combineObjects } from "./utils/helpers.ts";
import { Character, defaultCharacter } from "@elizaos/core";

const loadedCharacter: AgentData = loadCharacter("characters/spartacus.character.json");
const defaultChar: Character = {
	modelProvider: "openai",
	...defaultCharacter
};

export const character: Character = combineObjects(defaultChar, loadedCharacter);

