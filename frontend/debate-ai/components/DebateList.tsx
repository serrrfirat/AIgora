'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI } from '@/config/contracts';
import { Card } from './ui/card';
import { formatAddress } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

type DebateDetails = [
  string,      // topic
  bigint,      // startTime
  bigint,      // duration
  bigint,      // debateEndTime
  bigint,      // currentRound
  bigint,      // totalRounds
  boolean,     // isActive
  string,      // creator
  string,      // market
  string[],    // judges
  boolean,     // hasOutcome
  bigint       // finalOutcome
];

export function DebateList() {
  const router = useRouter();
  const { data: debateIds } = useReadContract({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getAllDebates',
  }) as { data: bigint[] | undefined };

  const { data: debateDetails } = useReadContracts({
    contracts: debateIds?.map((id) => ({
      address: DEBATE_FACTORY_ADDRESS,
      abi: DEBATE_FACTORY_ABI,
      functionName: 'getDebateDetails',
      args: [id],
    })) || [],
  });

  const handleDebateClick = (debateId: string) => {
    router.push(`/debate/${debateId}`);
  };

  return (
    <div className="space-y-4 p-4">
      {debateIds?.map((debateId, index) => {
        const details = debateDetails?.[index]?.result as DebateDetails | undefined;
        if (!details) return null;

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
        ] = details;

        return (
          <Card 
            key={debateId.toString()} 
            className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleDebateClick(debateId.toString())}
          >
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Debate #{debateId.toString()}</h3>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                <p>Topic: {topic}</p>
                <p>Status: {isActive ? 'Active' : 'Completed'}</p>
                <p>Current Round: {currentRound.toString()}/{totalRounds.toString()}</p>
                <p>Created by: {formatAddress(creator)}</p>
                <p>Number of Judges: {judges.length}</p>
                {hasOutcome && <p>Final Outcome: {finalOutcome.toString()}</p>}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}