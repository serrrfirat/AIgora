import { AgentData, loadCharacter, combineObjects } from "./utils/helpers.ts";
import { Character, defaultCharacter } from "@elizaos/eliza";

const loadedCharacter: AgentData = loadCharacter("characters/character.json");
const defaultChar: Character = defaultCharacter;

export const character: Character = combineObjects(defaultChar, loadedCharacter);

