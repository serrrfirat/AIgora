import React from "react";
import { formatEther, formatAddress } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type BondingCurveStruct = {
  target: bigint; // Target amount to reach
  current: bigint; // Current amount raised
  basePrice: bigint; // Starting price
  currentPrice: bigint; // Current price
  isFulfilled: boolean; // Whether target is reached
  endTime: bigint; // When bonding period ends
};
type ExpandedCardStruct = {
  aiDiscussion: boolean;
  bondingCurve: boolean;
  debateInfo: boolean;
  gladiators: boolean;
  leaderboard: boolean;
};

type BondingCurveProps = {
  bondingCurve: BondingCurveStruct | null;
  expandedCards: ExpandedCardStruct;
};

const BondingCurveComp = ({
  bondingCurve,
  expandedCards,
}: BondingCurveProps) => {
  return (
    <div>
      <Card className="bg-gradient-to-br from-[#52362B] to-[#3B2820] border border-[#D1BB9E]/20 shadow-xl">
        <div className="p-6 cursor-pointer flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-xl font-medium bg-gradient-to-r from-[#FFD700] to-[#CCAA00] bg-clip-text text-transparent">
              Bonding Curve
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#E6D5C3] px-3 py-1.5 rounded-full bg-[#2A1B15] border border-[#D1BB9E]/20 shadow-inner">
                ${formatEther(bondingCurve?.current || 0n)} / $
                {formatEther(bondingCurve?.target || 0n)}
              </span>
            </div>
          </div>

          <div className="relative w-full h-2">
            <div className="absolute inset-0 bg-[#2A1B15] rounded-full border border-[#D1BB9E]/20" />
            <div
              className="absolute inset-0 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  (Number(bondingCurve?.current || 0n) * 100) /
                    Number(bondingCurve?.target || 0n)
                )}%`,
                background: bondingCurve?.isFulfilled
                  ? "linear-gradient(90deg, #FFD700, #CCAA00)"
                  : "linear-gradient(90deg, #FFD700, #CCAA00)",
              }}
            />
          </div>
        </div>

        {expandedCards.bondingCurve && (
          <CardContent className="pt-0 pb-6">
            <div className="flex justify-between items-center text-sm text-[#E6D5C3] mt-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2A1B15] border border-[#D1BB9E]/20 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                Current: ${formatEther(bondingCurve?.current || 0n)}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2A1B15] border border-[#D1BB9E]/20 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-[#FFD700]" />
                Target: ${formatEther(bondingCurve?.target || 0n)}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default BondingCurveComp;
