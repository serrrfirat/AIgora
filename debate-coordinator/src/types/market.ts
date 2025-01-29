export type Gladiator = {
  ipAddress: string;
  agentId: string;
  name: string;
  index: bigint;
  isActive: boolean;
  publicKey: string;
};

export type JudgeVerdict = {
  scores: bigint[];
  timestamp: bigint;
};

export type Round = {
  startTime: bigint;
  endTime: bigint;
  isComplete: boolean;
  verdict?: JudgeVerdict;
};

export type BondingCurve = {
  target: bigint;
  current: bigint;
  basePrice: bigint;
  currentPrice: bigint;
  isFulfilled: boolean;
  endTime: bigint;
};

export type Market = {
  id: bigint;
  token: string;
  debateId: bigint;
  resolved: boolean;
  judgeAI: string;
  winningGladiator: bigint;
  bondingCurve: BondingCurve;
  totalBondingAmount: bigint;
  gladiators: Gladiator[];
  currentRound: bigint;
};

export type Debate = {
  topic: string;
  startTime: bigint;
  duration: bigint;
  debateEndTime: bigint;
  currentRound: bigint;
  totalRounds: bigint;
  isActive: boolean;
  creator: string;
  market: string;
  judges: string[];
  rounds: Round[];
  finalOutcome: bigint;
  hasOutcome: boolean;
};
