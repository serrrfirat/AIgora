import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { MARKET_FACTORY_ADDRESS, MARKET_FACTORY_ABI } from '@/config/contracts';
import { formatEther } from '@/lib/utils';
import { BribeSubmission } from './BribeSubmission';

type Gladiator = {
  aiAddress: string;
  name: string;
  model: string;
  index: bigint;
  isActive: boolean;
  publicKey: string;
};

type RoundStatus = {
  startTime: bigint;
  endTime: bigint;
  isComplete: boolean;
  hasVerdict: boolean;
  verdictTimestamp: bigint;
};

type LeaderboardEntry = {
  gladiatorIndex: bigint;
  totalScore: bigint;
  gladiator: Gladiator;
};

type RoundData = {
  roundIndex: bigint;
  endTime: bigint;
  isComplete: boolean;
};

interface GladiatorViewProps {
  marketId: bigint;
}

export function GladiatorView({ marketId }: GladiatorViewProps) {
  const [selectedGladiator, setSelectedGladiator] = useState<Gladiator | null>(null);
  const { isConnected } = useAccount();

  // Get gladiators
  const { data: gladiators } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getGladiators',
    args: [marketId],
  });

  // Get current round status
  const { data: currentRound } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getCurrentRound',
    args: [marketId],
  });

  // Get leaderboard
  const { data: leaderboardData } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getLeaderboard',
    args: [marketId],
  });

  // Format leaderboard data
  const leaderboard: LeaderboardEntry[] = leaderboardData 
    ? (leaderboardData as [bigint[], bigint[]]) [0].map((score: bigint, i: number) => ({
        gladiatorIndex: (leaderboardData as [bigint[], bigint[]])[1][i],
        totalScore: score,
        gladiator: (gladiators as Gladiator[])?.[Number((leaderboardData as [bigint[], bigint[]])[1][i])]
      }))
    : [];

  // Calculate time remaining in current round
  const timeRemaining = currentRound && (currentRound as { endTime: bigint }).endTime > 0n
    ? Number((currentRound as { endTime: bigint }).endTime) - Math.floor(Date.now() / 1000)
    : 0;

  return (
    <div className="space-y-6">
      {/* Current Round Status */}
      <Card className="p-4 bg-[#1C2128] border-0">
        <h2 className="text-xl font-bold mb-4">Current Round</h2>
        {currentRound ? (
          <div className="space-y-2">
            <p>Round {(currentRound as RoundData).roundIndex.toString()}</p>
            <p>Time Remaining: {Math.max(0, timeRemaining)} seconds</p>
            <p>Status: {(currentRound as RoundData).isComplete ? 'Complete' : 'In Progress'}</p>
          </div>
        ) : (
          <p>No active round</p>
        )}
      </Card>

      {/* Gladiator List */}
      <Card className="p-4 bg-[#1C2128] border-0">
        <h2 className="text-xl font-bold mb-4">Gladiators</h2>
        <div className="grid grid-cols-2 gap-4">
          {(gladiators as Gladiator[])?.map((gladiator: Gladiator) => (
            <Button
              key={gladiator.index.toString()}
              variant={selectedGladiator?.index === gladiator.index ? "default" : "outline"}
              onClick={() => setSelectedGladiator(gladiator)}
              className="w-full p-4 h-auto"
            >
              <div className="text-left">
                <p className="font-bold">{gladiator.name}</p>
                <p className="text-sm text-gray-400">{gladiator.model}</p>
                <p className="text-xs text-gray-500">
                  {gladiator.aiAddress.slice(0, 6)}...{gladiator.aiAddress.slice(-4)}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </Card>

      {/* Leaderboard */}
      <Card className="p-4 bg-[#1C2128] border-0">
        <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.gladiatorIndex.toString()}
              className="flex items-center justify-between p-2 bg-[#2D333B] rounded"
            >
              <div className="flex items-center space-x-2">
                <span className="font-bold">{index + 1}.</span>
                <span>{entry.gladiator?.name}</span>
              </div>
              <span className="font-mono">{entry.totalScore.toString()} pts</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Bribe Submission */}
      {selectedGladiator && (
        <BribeSubmission
          marketId={marketId}
          roundId={(currentRound as RoundData)?.roundIndex ?? 0n}
          gladiators={[selectedGladiator]}
          onBribeSubmitted={() => {
            // Refresh data after bribe
          }}
        />
      )}
    </div>
  );
} 