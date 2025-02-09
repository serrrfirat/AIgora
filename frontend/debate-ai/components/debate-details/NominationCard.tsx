import React from "react";
import { NominateGladiatorCard } from "./NominateGladiatorCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type BondingCurveStruct = {
  target: bigint; // Target amount to reach
  current: bigint; // Current amount raised
  basePrice: bigint; // Starting price
  currentPrice: bigint; // Current price
  isFulfilled: boolean; // Whether target is reached
  endTime: bigint; // When bonding period ends
};

type Gladiator = {
  aiAddress: string; // Address of the AI agent
  name: string; // Name of the gladiator
  index: bigint; // Index in gladiators array
  isActive: boolean; // Whether still in competition
  publicKey: string; // Public key for encrypted bribes
  tokenId: number; // Token ID of the NFT - making this required instead of optional
};

type NominationCardProps = {
  bondingCurve: BondingCurveStruct | null;
  marketId: unknown;
  isApproveConfirming: boolean;
  isApprovePending: boolean;
  isOrderPending: boolean;
  isOrderConfirming: boolean;
  isNominationModalOpen: boolean;
  setIsNominationModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userGladiators: Gladiator[];
  handleNominate: (tokenId: number | undefined) => void;
  isActive: boolean;
};

const NominationCard = ({
  bondingCurve,
  marketId,
  isApprovePending,
  isOrderPending,
  isApproveConfirming,
  isOrderConfirming,
  isNominationModalOpen,
  setIsNominationModalOpen,
  userGladiators,
  handleNominate,
  isActive,
}: NominationCardProps) => {
  return (
    <div>
      <NominateGladiatorCard
        marketId={marketId as bigint}
        isBondingCurveFulfilled={bondingCurve?.isFulfilled ?? false}
      />

      {/* Nomination Modal */}
      <Dialog
        open={isNominationModalOpen}
        onOpenChange={setIsNominationModalOpen}
      >
        <DialogContent className="sm:max-w-[600px] bg-[#52362B] border-[#D1BB9E]/20">
          <div className="p-6">
            <h2 className="text-2xl font-medium text-[#FFD700] mb-6">
              Select a Gladiator to Nominate
            </h2>

            {userGladiators.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#E6D5C3]">
                  You don&apos;t own any Gladiator NFTs yet.
                </p>
                <Button
                  className="mt-4 bg-[#D1BB9E] hover:bg-[#D1BB9E]/90 text-[#3D3D3D]"
                  onClick={() => {
                    setIsNominationModalOpen(false);
                    // Add navigation to mint page if you have one
                  }}
                >
                  Mint a Gladiator
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {userGladiators.filter(Boolean).map(
                  (gladiator) =>
                    gladiator && (
                      <div
                        key={gladiator.tokenId}
                        className={`bg-[#2A1B15] border border-[#D1BB9E]/20 rounded-lg p-4 transition-all ${
                          isActive
                            ? "cursor-pointer hover:border-[#FFD700]/50"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                        onClick={() => handleNominate(gladiator.tokenId)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#CCAA00]/20 border border-[#FFD700]/30 flex items-center justify-center">
                            <span className="text-2xl">🤖</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-[#E6D5C3]">
                              {gladiator.name || "Unnamed Gladiator"}
                            </h3>
                            <p className="text-sm text-[#D1BB9E]/60">
                              Token #{gladiator.tokenId || "Unknown"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NominationCard;
