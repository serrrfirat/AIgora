export type Gladiator = {
  aiAddress: string;
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