import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Menu } from "lucide-react";

interface Message {
  sender: string;
  content: string;
  timestamp: string;
}

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

type ToggleCardFunction = (cardName: keyof ExpandedCardStruct) => void;

type DebateDiscussionProps = {
  bondingCurve: BondingCurveStruct | null;
  expandedCards: ExpandedCardStruct;
  toggleCard: ToggleCardFunction;
  chatMessages: Message[];
};

export const DebateDiscussion = ({
  bondingCurve,
  expandedCards,
  toggleCard,
  chatMessages,
}: DebateDiscussionProps) => {
  return (
    <div>
      <Card className="bg-gradient-to-br from-[#52362B] to-[#3B2820] border border-[#D1BB9E]/20 mt-6 shadow-xl">
        <div
          className="p-6 cursor-pointer flex justify-between items-center hover:bg-[#2A1B15]/50 transition-colors rounded-t-lg"
          onClick={() => toggleCard("aiDiscussion")}
        >
          <div className="text-[#E6D5C3] font-medium flex items-center gap-2">
            <span className="text-[#FFD700]">•</span> AI Agents Discussion
          </div>
          <div className="flex items-center gap-3">
            {bondingCurve?.isFulfilled ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#2A1B15] border border-[#D1BB9E]/20 shadow-inner">
                  <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse"></div>
                  <span className="text-sm font-medium text-[#FFD700]">
                    Live
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#E6D5C3] transition-transform ${
                    expandedCards.aiDiscussion ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#2A1B15] border border-[#D1BB9E]/20 shadow-inner">
                <span className="text-sm font-medium text-[#E6D5C3]">
                  Locked 🔒
                </span>
              </div>
            )}
          </div>
        </div>

        {expandedCards.aiDiscussion && (
          <CardContent className="pt-0 pb-6">
            {bondingCurve?.isFulfilled ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className="flex gap-4 transform transition-all hover:translate-x-1"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#CCAA00]/20 border border-[#FFD700]/30 flex items-center justify-center text-[#FFD700] font-medium shrink-0 shadow-lg">
                      {message.sender.charAt(0)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="text-sm font-medium text-[#E6D5C3] flex items-center gap-2">
                        {message.sender}
                        <span className="h-px flex-1 bg-gradient-to-r from-[#D1BB9E]/20 to-transparent"></span>
                      </div>
                      <div className="bg-[#2A1B15] rounded-lg p-4 border border-[#D1BB9E]/20 shadow-lg hover:shadow-xl transition-shadow">
                        <p className="text-sm text-[#F5EDE4] leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#2A1B15] to-[#3B2820] rounded-full flex items-center justify-center mb-6 border border-[#D1BB9E]/20 shadow-lg">
                  <div className="text-2xl">🤖</div>
                </div>
                <div className="text-center space-y-3 max-w-md">
                  <h3 className="text-lg font-medium text-[#FFD700]">
                    AI Agents are waiting to start
                  </h3>
                  <p className="text-sm text-[#E6D5C3] leading-relaxed">
                    Once the bonding curve target is reached, three expert AI
                    agents will begin analyzing and debating this topic in
                    real-time.
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2A1B15] border border-[#D1BB9E]/20 shadow-inner">
                    <div className="text-sm text-[#FFD700]">
                      Progress:{" "}
                      {bondingCurve
                        ? (
                            (Number(bondingCurve.current) * 100) /
                            Number(bondingCurve.target)
                          ).toFixed(1)
                        : "0"}
                      % to unlock
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};
