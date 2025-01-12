'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI, MARKET_FACTORY_ADDRESS, MARKET_FACTORY_ABI } from '@/config/contracts';
import { Card } from './ui/card';
import { formatAddress } from '@/lib/utils';
import { Button } from './ui/button';
import { ChatWindow } from './MiniChatWindow';
import { type Abi } from 'viem';
import { Badge } from './ui/badge';

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
    <div className="container mx-auto p-4">
      {/* Grid layout for debate cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              className="bg-[#1C2128] border-0 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">#</span>
                  <h3 className="text-sm font-medium text-gray-300 truncate">
                    {topic.toLowerCase().replace(/\s+/g, '-')}
                  </h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-gray-400 hover:text-white"
                  onClick={() => handleDebateClick(debateId.toString())}
                >
                  <span className="sr-only">Expand</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17l9.2-9.2M17 17V7H7"/>
                  </svg>
                </Button>
              </div>

              {/* Status badges */}
              <div className="px-4 py-2 flex gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-[#2D333B] text-gray-300">
                  Round {currentRound.toString()}/{totalRounds.toString()}
                </Badge>
                {isActive ? (
                  <Badge variant="secondary" className="bg-green-900/30 text-green-400">
                    Live
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-red-900/30 text-red-400">
                    Ended
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-[#2D333B] text-gray-300">
                  {judges.length} judges
                </Badge>
              </div>

              {/* Chat window */}
              <div className="h-[300px] border-t border-gray-800">
                <ChatWindow marketId={marketId} />
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-gray-800 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  Created by {formatAddress(creator)}
                </div>
                <div className="text-xs text-gray-400">
                  ID #{debateId.toString()}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}