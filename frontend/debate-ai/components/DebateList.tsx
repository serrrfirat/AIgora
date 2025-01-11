import { useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI } from "@/config/contracts";
import { Card } from "./ui/card";
import { formatAddress } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import {
  MessageCircle,
  Users,
  Clock,
  Award,
  ChevronRight,
  Activity,
  MessagesSquare,
  Plus,
} from "lucide-react";

type DebateDetails = [
  string,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  boolean,
  string,
  string,
  string[],
  boolean,
  bigint
];

const ITEMS_PER_PAGE = 6;

export function DebateList() {
  const router = useRouter();
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE);

  const { data: debateIds } = useReadContract({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: "getAllDebates",
  }) as { data: bigint[] | undefined };

  const { data: debateDetails } = useReadContracts({
    contracts:
      debateIds?.map((id) => ({
        address: DEBATE_FACTORY_ADDRESS,
        abi: DEBATE_FACTORY_ABI,
        functionName: "getDebateDetails",
        args: [id],
      })) || [],
  });

  const handleDebateClick = (debateId: string) => {
    router.push(`/debate/${debateId}`);
  };

  const handleLoadMore = () => {
    setVisibleItems((prev) =>
      Math.min(prev + ITEMS_PER_PAGE, debateIds?.length || 0)
    );
  };

  const visibleDebates = debateIds?.slice(0, visibleItems) || [];
  const hasMore = debateIds ? visibleItems < debateIds.length : false;

  return (
    <div className="space-y-8 p-4 w-full flex flex-col items-center">
      <div className="grid w-[80vw] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleDebates.map((debateId, index) => {
          const details = debateDetails?.[index]?.result as
            | DebateDetails
            | undefined;
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
            finalOutcome,
          ] = details;

          return (
            <Card
              key={debateId.toString()}
              className="group p-6 bg-[#202936] border-4 border-[#298080] rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden relative"
              onClick={() => handleDebateClick(debateId.toString())}
            >
              {/* Status Indicator */}
              <div
                className={`absolute top-0 right-0 w-20 h-20 -mt-10 -mr-10 rotate-45 ${
                  isActive ? "bg-green-500/20" : "bg-red-500/20"
                }`}
              />

              <div className="flex flex-col gap-4">
                {/* Topic Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#298080] mb-2">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">
                      Debate Topic
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white leading-tight group-hover:text-[#298080] transition-colors">
                    {topic}
                  </h3>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#298080]/20">
                  <div className="flex items-center gap-2">
                    <MessagesSquare className="w-4 h-4 text-[#298080]" />
                    <span className="text-sm text-gray-400">0 Messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#298080]" />
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-green-500 status-dot" />
                      )}
                      <span
                        className={`text-sm ${
                          isActive ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {isActive ? "Active" : "Completed"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#298080]" />
                    <span className="text-sm text-gray-400">
                      {currentRound.toString()}/{totalRounds.toString()} Rounds
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#298080]" />
                    <span className="text-sm text-gray-400">
                      {judges.length} Judges
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#298080]/20 flex items-center justify-center">
                      <Award className="w-4 h-4 text-[#298080]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400">Created by</span>
                      <span className="text-sm text-white">
                        {formatAddress(creator)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#298080] hover:text-white hover:bg-[#298080] transition-colors"
                  >
                    View
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                {/* Outcome Badge */}
                {hasOutcome && (
                  <div className="absolute top-4 right-4 px-2 py-1 bg-[#298080]/10 rounded-full border border-[#298080]/20">
                    <span className="text-xs text-[#298080]">
                      Outcome: {finalOutcome.toString()}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            className="border-[#298080] font-semibold text-[#298080] pixelated-2 hover:bg-[#298080] hover:text-white transition-colors gap-2"
          >
            <Plus className="w-4 h-4 pixelated-2" />
            Load More Debates
          </Button>
        </div>
      )}
    </div>
  );
}
