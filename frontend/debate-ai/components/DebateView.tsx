'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI, OUTCOME_COUNT } from '@/config/contracts';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';

interface DebateDetails {
  topic: string;
  startTime: bigint;
  duration: bigint;
  debateEndTime: bigint;
  currentRound: bigint;
  totalRounds: bigint;
  isActive: boolean;
  creator: `0x${string}`;
  market: `0x${string}`;
  judges: `0x${string}`[];
  hasOutcome: boolean;
  finalOutcome: bigint;
}

interface RoundInfo {
  isComplete: boolean;
  judgeCount: bigint;
  totalScores: bigint[];
  startTime: bigint;
  endTime: bigint;
}

interface DebateViewProps {
  debateId: number;
}

export function DebateView({ debateId }: DebateViewProps) {
  const { address, isConnected } = useAccount();
  const [scores, setScores] = useState<number[]>(Array(OUTCOME_COUNT).fill(0));
  const [totalScore, setTotalScore] = useState(0);

  // Get debate details
  const { data: debateDetails } = useReadContract({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getDebateDetails',
    args: [BigInt(debateId)],
  });

  // Get current round info
  const { data: roundInfo } = useReadContract({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getRoundInfo',
    args: [BigInt(debateId), debateDetails?.[4] ?? 0n], // currentRound
  });

  // Get judge scores for current round
  const { data: judgeScores } = useReadContract({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getJudgeScores',
    args: [BigInt(debateId), debateDetails?.[4] ?? 0n, address!],
  });

  // Get current probabilities
  const { data: probabilities } = useReadContract({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getCurrentProbabilities',
    args: [BigInt(debateId)],
  });

  const { writeContract: scoreRound, isLoading: isScoring } = useWriteContract({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'scoreRound',
  });

  const handleScoreChange = (index: number, value: number) => {
    const newScores = [...scores];
    newScores[index] = value;
    setScores(newScores);
    setTotalScore(newScores.reduce((a, b) => a + b, 0));
  };

  const handleSubmitScores = () => {
    if (totalScore !== MAX_SCORE || !debateDetails) return;
    
    scoreRound({
      args: [
        BigInt(debateId),
        debateDetails.currentRound,
        scores.map(s => BigInt(s))
      ],
    });
  };

  if (!debateDetails) return <div>Loading debate details...</div>;

  const isJudge = debateDetails.judges.includes(address as `0x${string}`);
  const canScore = isJudge && debateDetails.isActive && !judgeScores?.some(s => s > 0n);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{debateDetails.topic}</CardTitle>
        <CardDescription>
          Round {Number(debateDetails.currentRound)} of {Number(debateDetails.totalRounds)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Debate Status */}
          <div>
            <h3 className="font-semibold">Status</h3>
            <p>Active: {debateDetails.isActive ? 'Yes' : 'No'}</p>
            <p>Time Remaining: {Math.max(0, Number(debateDetails.debateEndTime - BigInt(Date.now() / 1000)))} seconds</p>
            {debateDetails.hasOutcome && <p>Final Outcome: {Number(debateDetails.finalOutcome)}</p>}
          </div>

          {/* Current Round */}
          {roundInfo && (
            <div>
              <h3 className="font-semibold">Current Round</h3>
              <p>Complete: {roundInfo.isComplete ? 'Yes' : 'No'}</p>
              <p>Judges Scored: {Number(roundInfo.judgeCount)}</p>
              <div className="mt-2">
                <h4>Total Scores:</h4>
                {roundInfo.totalScores.map((score, i) => (
                  <p key={i}>Outcome {i}: {Number(score)}</p>
                ))}
              </div>
            </div>
          )}

          {/* Probabilities */}
          {probabilities && (
            <div>
              <h3 className="font-semibold">Current Probabilities</h3>
              {probabilities.map((prob, i) => (
                <p key={i}>Outcome {i}: {Number(prob) / 100}%</p>
              ))}
            </div>
          )}

          {/* Scoring Interface */}
          {canScore && (
            <div className="space-y-4">
              <h3 className="font-semibold">Score Round</h3>
              <p className="text-sm text-gray-500">
                Assign scores to each outcome (total must equal {MAX_SCORE})
              </p>
              {scores.map((score, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Label>Outcome {i}</Label>
                  <Input
                    type="number"
                    min="0"
                    max={MAX_SCORE}
                    value={score}
                    onChange={(e) => handleScoreChange(i, Number(e.target.value))}
                  />
                </div>
              ))}
              <div className="flex justify-between items-center">
                <p>Total Score: {totalScore}/{MAX_SCORE}</p>
                <Button
                  onClick={handleSubmitScores}
                  disabled={totalScore !== MAX_SCORE || isScoring}
                >
                  {isScoring ? 'Submitting...' : 'Submit Scores'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 