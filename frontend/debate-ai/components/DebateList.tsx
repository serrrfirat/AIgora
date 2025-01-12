'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI, MARKET_FACTORY_ADDRESS, MARKET_FACTORY_ABI } from '@/config/contracts';
import { Card } from './ui/card';
import { formatAddress } from '@/lib/utils';
import { Button } from './ui/button';
import { ChatWindow } from './MiniChatWindow';
import { type Abi } from 'viem';

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

interface DebateWithId {
  id: bigint;
  details: DebateDetails;
  marketId: bigint;
}

function sortDebatesByStartTime(debates: DebateWithId[]): DebateWithId[] {
  return [...debates].sort((a, b) => {
    const timeA = Number(a.details[1]); // startTime
    const timeB = Number(b.details[1]); // startTime
    return timeB - timeA; // Sort in descending order (newest first)
  });
}

export function DebateList() {
  // Get all debate IDs
  const { data: debateIds } = useReadContract({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI as unknown as Abi,
    functionName: 'getAllDebates',
  }) as { data: bigint[] | undefined };

  // Get debate details for each ID
  const { data: debateDetails } = useReadContracts({
    contracts: (debateIds || []).map((id) => ({
      address: DEBATE_FACTORY_ADDRESS,
      abi: DEBATE_FACTORY_ABI as unknown as Abi,
      functionName: 'getDebateDetails',
      args: [id],
    })),
  });

  // Get market ID for each debate ID
  const { data: marketIdsData } = useReadContracts({
    contracts: (debateIds || []).map((id) => ({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI as unknown as Abi,
      functionName: 'debateIdToMarketId',
      args: [id],
    })),
  });

  const handleDebateClick = (debateId: string) => {
    window.location.href = `/debate/${debateId}`;
  };

  // Combine all data and sort
  const debates: DebateWithId[] = [];
  debateIds?.forEach((id, index) => {
    const details = debateDetails?.[index]?.result as DebateDetails | undefined;
    const marketId = marketIdsData?.[index]?.result as bigint | undefined;
    
    if (details && marketId) {
      debates.push({ id, details, marketId });
    }
  });

  const sortedDebates = sortDebatesByStartTime(debates);

  return (
    <div className="space-y-8 p-4">
      {sortedDebates.map(({ id: debateId, details, marketId }) => {
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
            className="p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{topic}</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDebateClick(debateId.toString())}
                >
                  View Details
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                <p>Debate ID: #{debateId.toString()}</p>
                <p>Market ID: #{marketId.toString()}</p>
                <p>Status: {isActive ? 'Active' : 'Completed'}</p>
                <p>Current Round: {currentRound.toString()}/{totalRounds.toString()}</p>
                <p>Created by: {formatAddress(creator)}</p>
                <p>Number of Judges: {judges.length}</p>
                {hasOutcome && <p>Final Outcome: {finalOutcome.toString()}</p>}
              </div>
              {/* Add chat window with fixed height */}
              <div className="h-[300px] border rounded-lg">
                <ChatWindow marketId={marketId} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}