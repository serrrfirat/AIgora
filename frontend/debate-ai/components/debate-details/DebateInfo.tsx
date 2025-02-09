import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatEther, formatAddress } from "@/lib/utils";
import { Clock, Users, Trophy } from "lucide-react";

type ExpandedCardStruct = {
  aiDiscussion: boolean;
  bondingCurve: boolean;
  debateInfo: boolean;
  gladiators: boolean;
  leaderboard: boolean;
};

type DebateDetails = [
  topic: string, // topic
  startTime: bigint, // startTime
  duration: bigint, // duration
  debateEndTime: bigint, // debateEndTime
  currentRound: bigint, // currentRound
  totalRounds: bigint, // totalRounds
  isActive: boolean, // isActive
  creator: string, // creator
  market: string, // market
  judges: string[], // judges
  hasOutcome: boolean, // hasOutcome
  finalOutcome: bigint, // finalOutcome
];

type DebateInfoProps = {
  expandedCards: ExpandedCardStruct;
  debateDetails: DebateDetails | undefined;
  totalVolume: bigint | undefined;
  timeRemaining: number;
};

function DebateInfo({
  expandedCards,
  debateDetails,
  totalVolume,
  timeRemaining,
}: DebateInfoProps) {
  // Format total volume
  const totalVolumeFormatted = formatEther(totalVolume || 0n);

  const daysRemaining = Math.floor(timeRemaining / (24 * 60 * 60));
  const hoursRemaining = Math.floor((timeRemaining % (24 * 60 * 60)) / 3600);

  let isDummyActive = true;
  if (daysRemaining === 0 && hoursRemaining === 0) {
    isDummyActive = false;
  }

  const [
    topic,
    startTime,
    duration,
    debateEndTime,
    currentRound,
    totalRounds,
    isActive, // TODO: change it later on from contract
    creator,
    market,
    judges,
    hasOutcome,
    finalOutcome,
  ] = debateDetails || [];

  return (
    <div>
      <div className="backdrop-blur-sm bg-gradient-to-br from-[#52362B] to-[#3B2820] rounded-lg border border-[#D1BB9E]/20 shadow-xl">
        {expandedCards.debateInfo && (
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Header Section */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-3 flex-1">
                  <h2 className="text-2xl md:text-3xl font-medium tracking-tight bg-gradient-to-r from-[#FFD700] to-[#CCAA00] bg-clip-text text-transparent">
                    {topic || "Loading..."}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-2 text-[#E6D5C3]">
                      <Users className="w-4 h-4" />
                      <span>{formatAddress(creator || "")}</span>
                    </div>

                    <div className="flex items-center px-3 py-1.5 rounded-full bg-[#2A1B15] border border-[#D1BB9E]/20 shadow-inner">
                      <span className="text-[#E6D5C3]">
                        ${totalVolumeFormatted}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2A1B15] border border-[#D1BB9E]/20 shadow-inner">
                      <Trophy className="w-4 h-4 text-[#FFD700]" />
                      <span className="text-[#E6D5C3] font-medium">
                        {currentRound?.toString() || "0"}/
                        {totalRounds?.toString() || "0"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium gap-2 shadow-lg
      ${
        isDummyActive
          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
          : "bg-rose-500/10 text-rose-300 border border-rose-500/30"
      }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isDummyActive
                          ? "bg-emerald-300 animate-pulse"
                          : "bg-rose-300"
                      }`}
                    />
                    <span>{isDummyActive ? "Active" : "Ended"}</span>
                  </div>

                  {isDummyActive && (
                    <div className="flex items-center gap-2 text-sm text-[#E6D5C3]">
                      <Clock className="w-4 h-4" />
                      <span>
                        {daysRemaining}d {hoursRemaining}h remaining
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </div>
    </div>
  );
}

export default DebateInfo;
