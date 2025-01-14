import { AgentData, loadCharacter, combineObjects } from "./utils/helpers.ts";
import { Character, defaultCharacter, ModelProviderName } from "@elizaos/core";

const loadedTemplates: AgentData = loadCharacter("characters/spartacus.character.json");

const defaultChar: Character = {
  modelProvider: ModelProviderName.OPENAI,
  settings: { model: "gpt-o1-mini" },
  ...defaultCharacter
};

export const character: Character = combineObjects(defaultChar, loadedTemplates);

