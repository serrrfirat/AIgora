/**
 * JSON object storing the data for the agent. Basically here so the compiler doesn't yell.
 */
export interface AgentData {
  name: string,
  system: string,
  template: TwitterTemplate,
}

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
