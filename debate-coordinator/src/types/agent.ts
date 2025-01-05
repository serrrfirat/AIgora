export type AgentMessage = {
  content: string;
  timestamp: string;
  gladiatorName: string;
  gladiatorIndex: number;
};

export type JudgeVerdict = {
  scores: number[];
  reasoning: string;
};

export type AgentResponse = {
  success: boolean;
  message?: AgentMessage;
  error?: string;
};

export type JudgeResponse = {
  success: boolean;
  verdict?: JudgeVerdict;
  error?: string;
};
