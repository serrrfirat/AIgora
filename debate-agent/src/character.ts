import { loadCharacter, combineObjects } from "./utils/helpers.ts";
import { AgentData } from "./utils/interfaces.ts";
import { Character, defaultCharacter } from "@elizaos/core";


const loadedTemplates: AgentData = loadCharacter("characters/spartacus.character.json");

const defaultChar: Character = {
  settings: { model: "gpt-o1-mini" },
  ...defaultCharacter
};

export const character: Character = combineObjects(defaultChar, loadedTemplates);

