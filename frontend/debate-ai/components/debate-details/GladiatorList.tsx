import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatEther, formatAddress } from "@/lib/utils";

const BASIS_POINTS = 10000n;

type ExpandedCardStruct = {
  aiDiscussion: boolean;
  bondingCurve: boolean;
  debateInfo: boolean;
  gladiators: boolean;
  leaderboard: boolean;
};

type Gladiator = {
  aiAddress: string; // Address of the AI agent
  name: string; // Name of the gladiator
  index: bigint; // Index in gladiators array
  isActive: boolean; // Whether still in competition
  publicKey: string; // Public key for encrypted bribes
  tokenId: number; // Token ID of the NFT - making this required instead of optional
};

type GladiatorListProps = {
  expandedCards: ExpandedCardStruct;
  setIsNominationModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isConnected: boolean;
  indexedGladiators: Gladiator[];
  gladiatorPrices: bigint[] | undefined;
  gladiatorVolumes: bigint[] | undefined;
  totalVolume: bigint | undefined;
  handleAmountChange: (value: string) => void;
  setAmount: React.Dispatch<React.SetStateAction<string>>;
  setOrderType: React.Dispatch<React.SetStateAction<"buy" | "sell">>;
  setSelectedGladiator: React.Dispatch<React.SetStateAction<Gladiator | null>>;
};

const GladiatorListComp = ({
  expandedCards,
  setIsNominationModalOpen,
  isConnected,
  indexedGladiators,
  gladiatorPrices,
  gladiatorVolumes,
  totalVolume,
  handleAmountChange,
  setAmount,
  setOrderType,
  setSelectedGladiator,
}: GladiatorListProps) => {
  return (
    <div>
      {" "}
      <Card className="bg-gradient-to-br from-[#52362B] to-[#3B2820] border border-[#D1BB9E]/20 mt-6 shadow-xl">
        {expandedCards.gladiators && (
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Header with dividers */}
              <div className="border-y border-[#D1BB9E]/20">
                <div className="grid grid-cols-[2fr,1fr,1fr,1fr] gap-4 px-2 py-3 text-lg text-[#E6D5C3] items-center">
                  <div className="flex items-center gap-3">
                    <span>Gladiator</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-[#2A1B15] text-[#FFD700] border-[#FFD700]/30 hover:bg-[#FFD700]/20 hover:border-[#FFD700]/50 transition-colors"
                      disabled={!isConnected}
                      onClick={() => {
                        if (!isConnected) {
                          // Handle not connected case
                          return;
                        }
                        setIsNominationModalOpen(true);
                      }}
                    >
                      + Nominate
                    </Button>
                  </div>
                  <div className="text-right">Volume</div>
                  <div className="text-right">Probability</div>
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-2">
                {indexedGladiators.map((gladiator, index) => {
                  if (!gladiator) return null;
                  const currentPrice =
                    Number(gladiatorPrices?.[Number(gladiator.index)] || 0n) /
                    Number(BASIS_POINTS);
                  const volume = gladiatorVolumes
                    ? formatEther(gladiatorVolumes[Number(gladiator.index)])
                    : "0";
                  const totalVolumeFormatted = formatEther(totalVolume || 0n);
                  const volumePercentage =
                    totalVolumeFormatted !== "0"
                      ? (
                          (Number(volume) / Number(totalVolumeFormatted)) *
                          100
                        ).toFixed(1)
                      : currentPrice.toFixed(1);

                  const impliedProbability =
                    totalVolumeFormatted !== "0"
                      ? (
                          (Number(volume) / Number(totalVolumeFormatted)) *
                          100
                        ).toFixed(1)
                      : currentPrice.toFixed(1);

                  const yesPrice = (Number(impliedProbability) / 100).toFixed(
                    2
                  );
                  const noPrice = (
                    1 -
                    Number(impliedProbability) / 100
                  ).toFixed(2);

                  return (
                    <div
                      key={index}
                      className="border-b border-[#D1BB9E]/20 last:border-none"
                    >
                      <div className="grid grid-cols-[2fr,1fr,1fr,1fr] gap-4 px-2 py-4 hover:bg-[#2A1B15] transition-colors items-center rounded-lg">
                        <div>
                          <div className="font-medium text-[#E6D5C3]">
                            {gladiator.name}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-[#E6D5C3]">
                            ${volume}
                          </div>
                          <div className="text-xs text-[#D1BB9E]/60">
                            {volumePercentage}%
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-medium text-[#FFD700]">
                            {impliedProbability}%
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-3 py-1 h-auto bg-[#2A1B15] text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors"
                            onClick={() => {
                              console.log("gladiator", gladiator);
                              setSelectedGladiator(gladiator);
                              setOrderType("buy");
                              setAmount("1");
                              handleAmountChange("1");
                            }}
                            disabled={!isConnected}
                          >
                            {yesPrice}¢
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-3 py-1 h-auto bg-[#2A1B15] text-rose-400 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50 transition-colors"
                            onClick={() => {
                              setSelectedGladiator(gladiator);
                              setOrderType("sell");
                              setAmount("1");
                              handleAmountChange("1");
                            }}
                            disabled={!isConnected}
                          >
                            {noPrice}¢
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default GladiatorListComp;
