import { useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import {
  DEBATE_FACTORY_ADDRESS,
  DEBATE_FACTORY_ABI,
  MARKET_FACTORY_ADDRESS,
  MARKET_FACTORY_ABI,
} from "@/config/contracts";
import { Card } from "./ui/card";
import { formatAddress } from "@/lib/utils";
import { Button } from "./ui/button";
import { ChatWindow } from "./MiniChatWindow";
import { type Abi } from "viem";
import {
  Award,
  ChevronRight,
  Clock,
  MessagesSquare,
  Plus,
  Users,
} from "lucide-react";

// Type for how bonding curve is returned from contract
type BondingCurve = [
  bigint, // target
  bigint, // current
  bigint, // basePrice
  bigint, // currentPrice
  boolean, // isFulfilled
  bigint, // endTime
];

type DebateDetails = [
  string, // topic
  bigint, // startTime
  bigint, // duration
  bigint, // debateEndTime
  bigint, // currentRound
  bigint, // totalRounds
  boolean, // isActive
  string, // creator
  string, // market
  string[], // judges
  boolean, // hasOutcome
  bigint, // finalOutcome
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
  const [visibleItems, setVisibleItems] = useState(6);

  // Get all debate IDs
  const { data: debateIds } = useReadContract({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI as unknown as Abi,
    functionName: "getAllDebates",
  }) as { data: bigint[] | undefined };

  // Get debate details for each ID
  const { data: debateDetails } = useReadContracts({
    contracts: (debateIds || []).map((id) => ({
      address: DEBATE_FACTORY_ADDRESS,
      abi: DEBATE_FACTORY_ABI as unknown as Abi,
      functionName: "getDebateDetails",
      args: [id],
    })),
  });

  // Get market ID for each debate ID
  const { data: marketIdsData } = useReadContracts({
    contracts: (debateIds || []).map((id) => ({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI as unknown as Abi,
      functionName: "debateIdToMarketId",
      args: [id],
    })),
  });

  const handleDebateClick = (debateId: string) => {
    window.location.href = `/debate/${debateId}`;
  };

  // Combined all data and sort
  const debates: DebateWithId[] = [];
  debateIds?.forEach((id, index) => {
    const details = debateDetails?.[index]?.result as DebateDetails | undefined;
    const marketId = marketIdsData?.[index]?.result as bigint | undefined;

    if (details && marketId) {
      debates.push({ id, details, marketId });
    }
  });

  const sortedDebates = sortDebatesByStartTime(debates);
  const visibleDebates = sortedDebates.slice(0, visibleItems);
  const hasMore = visibleItems < sortedDebates.length;

  const handleLoadMore = () => {
    setVisibleItems((prev) => prev + 6);
  };

  const { data: bondingCurveDetailsList } = useReadContracts({
    contracts: (marketIdsData || []).map((marketIdData) => ({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI as unknown as Abi,
      functionName: "getBondingCurveDetails",
      args: marketIdData?.result ? [marketIdData.result] : undefined,
    })),
  });

  const bondingCurveMap = new Map<string, BondingCurve>();

  (marketIdsData || []).forEach((marketIdData, index) => {
    const marketId = marketIdData.result?.toString();
    const details = bondingCurveDetailsList?.[index]?.result as
      | BondingCurve
      | undefined;
    if (marketId && details) {
      bondingCurveMap.set(marketId, details);
    }
  });

  return (
    <div className="space-y-8 p-4 w-full flex flex-col items-center pixelated-2">
      <div className="grid w-[80vw] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleDebates.map(({ id: debateId, details, marketId }, index) => {
          if (!details) return null;

          const [
            topic,
            currentRound,
            totalRounds,
            isActive,
            creator,
            judges,
            hasOutcome,
            finalOutcome,
          ] = details;

          // Fetch bonding curve details
          const bondingCurveDetails = bondingCurveMap.get(marketId.toString());

          const isFulfilled = bondingCurveDetails
            ? bondingCurveDetails[4]
            : false;

          const endTime = bondingCurveDetails ? bondingCurveDetails[5] : 0n;

          const timeRemaining = endTime
            ? Math.max(0, Number(endTime) - Math.floor(Date.now() / 1000))
            : 0;

          const daysRemaining = Math.floor(timeRemaining / (24 * 60 * 60));
          const hoursRemaining = Math.floor(
            (timeRemaining % (24 * 60 * 60)) / 3600
          );

          let isDummyActive = true;
          if (daysRemaining === 0 && hoursRemaining === 0) {
            isDummyActive = false;
          }

          return (
            <Card
              key={debateId.toString()}
              className="group p-6 bg-[#52362B] border-2 border-[#52362B] rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden relative"
            >
              <div
                className={`absolute top-0 right-0 w-20 h-20 -mt-10 -mr-10 rotate-45 bg-[#D1BB9E]`}
              />

              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#FAF9F6] mb-2"></div>
                  <h3 className="text-xl font-bold text-[#CCAA00] leading-tight group-hover:text-[#CCAA00] transition-colors">
                    {topic}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#FAF9F6]/50">
                  <div className="flex items-center gap-2">
                    <MessagesSquare className="w-4 h-4 text-[#FAF9F6]" />
                    <span className="text-sm text-gray-400">0 Messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {isDummyActive && (
                        <div className="w-2 h-2 rounded-full bg-green-500 status-dot animate-blink" />
                      )}
                      <span
                        className={`text-sm ${
                          isDummyActive ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {isDummyActive ? "Active" : "Completed"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FAF9F6]" />
                    <span className="text-sm text-gray-400">
                      {currentRound.toString()}/{totalRounds.toString()} Rounds
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#FAF9F6]" />
                    <span className="text-sm text-gray-400">
                      {judges} Judges
                    </span>
                  </div>
                </div>

                <div className="h-[300px] border-t border-gray-800">
                  {!isFulfilled ? (
                    <div className="flex flex-col items-center justify-center py-1 px-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#2A1B15] to-[#3B2820] rounded-full flex items-center justify-center mb-2 mt-2 border border-[#D1BB9E]/20 shadow-lg">
                        <div className="text-2xl">🤖</div>
                      </div>
                      <div className="text-center space-y-1 max-w-md">
                        <h3 className="text-lg font-medium text-[#FFD700]">
                          AI Agents are waiting to start
                        </h3>
                        <p className="text-sm text-[#E6D5C3] leading-relaxed">
                          Once the bonding curve target is reached, three expert
                          AI agents will begin analyzing and debating this topic
                          in real-time.
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2A1B15] border border-[#D1BB9E]/20 shadow-inner">
                          <div className="text-sm text-[#FFD700]">
                            Progress:{" "}
                            {bondingCurveDetails
                              ? (
                                  (Number(bondingCurveDetails[1]) * 100) /
                                  Number(bondingCurveDetails[0])
                                ).toFixed(1)
                              : "0"}
                            % to unlock
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ChatWindow marketId={marketId} />
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#FAF9F6]/20 flex items-center justify-center">
                      <Award className="w-4 h-4 text-[#FAF9F6]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400">Created by</span>
                      <span className="text-sm text-white">
                        {formatAddress(creator.toString())}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#FAF9F6] hover:text-black hover:bg-[#FAF9F6] transition-colors"
                    onClick={() => handleDebateClick(debateId.toString())}
                  >
                    View
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            className="border-[#52362B] font-semibold text-[#52362B] pixelated-2 hover:bg-[#52362B] hover:text-white transition-colors gap-2"
          >
            <Plus className="w-4 h-4 pixelated-2" />
            Load More Debates
          </Button>
        </div>
      )}
    </div>
  );
}

export default DebateList;
