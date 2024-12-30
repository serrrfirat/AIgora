'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI } from '@/config/contracts';
import { useAccount, useContractRead, useContractWrite } from 'wagmi';

const OUTCOME_COUNT = 5;
const MAX_SCORE = 10;

interface DebateViewProps {
  debateId: number;
}

export function DebateView({ debateId }: DebateViewProps) {
  const { address, isConnected } = useAccount();
  const [scores, setScores] = useState<number[]>(Array(OUTCOME_COUNT).fill(0));
  const [totalScore, setTotalScore] = useState(0);

  // Get debate details
  const { data: debateDetails } = useContractRead({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getDebateDetails',
    args: [BigInt(debateId)],
  });

  // Get current round info
  const { data: roundInfo } = useContractRead({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getRoundInfo',
    args: [BigInt(debateId), debateDetails?.[4] ?? 0n], // currentRound
    enabled: !!debateDetails,
  });

  // Get judge scores for current round
  const { data: judgeScores } = useContractRead({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getJudgeScores',
    args: [BigInt(debateId), debateDetails?.[4] ?? 0n, address!],
    enabled: !!debateDetails && !!address,
  });

  // Get current probabilities
  const { data: probabilities } = useContractRead({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getCurrentProbabilities',
    args: [BigInt(debateId)],
    enabled: !!debateDetails,
  });

  const { write: scoreRound, isLoading: isScoring } = useContractWrite({
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
    if (totalScore !== MAX_SCORE) return;
    
    scoreRound({
      args: [
        BigInt(debateId),
        debateDetails?.[4] ?? 0n, // currentRound
        scores.map(s => BigInt(s))
      ],
    });
  };

  if (!debateDetails) return <div>Loading debate details...</div>;

  const [
    topic,
    startTime,
    duration,
    debateEndTime,
    currentRound,
    totalRounds,
    isActive,
    creator,
    market,
    judges,
    hasOutcome,
    finalOutcome
  ] = debateDetails;

  const isJudge = judges.includes(address!);
  const canScore = isJudge && isActive && !judgeScores?.some(s => s > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{topic}</CardTitle>
        <CardDescription>
          Round {Number(currentRound)} of {Number(totalRounds)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Debate Status */}
          <div>
            <h3 className="font-semibold">Status</h3>
            <p>Active: {isActive ? 'Yes' : 'No'}</p>
            <p>Time Remaining: {Math.max(0, Number(debateEndTime) - Date.now() / 1000)} seconds</p>
            {hasOutcome && <p>Final Outcome: {Number(finalOutcome)}</p>}
          </div>

          {/* Current Round */}
          {roundInfo && (
            <div>
              <h3 className="font-semibold">Current Round</h3>
              <p>Complete: {roundInfo[0] ? 'Yes' : 'No'}</p>
              <p>Judges Scored: {Number(roundInfo[1])}</p>
              <div className="mt-2">
                <h4>Total Scores:</h4>
                {roundInfo[2].map((score, i) => (
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