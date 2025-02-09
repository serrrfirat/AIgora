import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { MARKET_FACTORY_ADDRESS, MARKET_FACTORY_ABI } from "@/config/contracts";
import { formatEther } from "@/lib/utils";

// Add type definition for bribes
type Bribe = {
  briber: string;
  amount: bigint;
  information: string;
  timestamp: bigint;
  outcomeIndex: bigint;
};

type BribesResponse = [string[], bigint[], string[], bigint[], bigint[]];

interface BribeSubmissionProps {
  marketId: bigint;
  roundId: bigint;
  gladiators: { name: string; index: bigint }[];
  onBribeSubmitted?: () => void;
}

export function BribeSubmission({
  marketId,
  roundId,
  gladiators,
  onBribeSubmitted,
}: BribeSubmissionProps) {
  const [information, setInformation] = useState("");
  const [selectedGladiator, setSelectedGladiator] = useState<bigint | null>(
    null
  );
  const { isConnected } = useAccount();

  const { writeContract: submitBribe, isPending } = useWriteContract();

  // Get existing bribes for this round with proper typing
  const { data: bribesData } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: "getBribesForRound",
    args: [marketId, roundId],
  });

  const typedBribesData = bribesData as BribesResponse | undefined;

  const handleSubmit = async () => {
    if (!selectedGladiator || !information.trim()) {
      return;
    }

    try {
      submitBribe({
        address: MARKET_FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: "submitBribe",
        args: [marketId, roundId, information, selectedGladiator],
      });

      // Clear form after successful submission
      setInformation("");
      setSelectedGladiator(null);

      // Notify parent component
      if (onBribeSubmitted) {
        onBribeSubmitted();
      }
    } catch (error) {
      // Keep error logging for production debugging
      console.error("Error submitting bribe:", error);
    }
  };

  const handleGladiatorSelect = (gladiator: {
    name: string;
    index: bigint;
  }) => {
    const newSelection = BigInt(gladiator.index.toString());
    setSelectedGladiator(newSelection);
  };

  const isGladiatorSelected = (gladiatorIndex: bigint) => {
    if (!selectedGladiator) return false;
    return selectedGladiator.toString() === gladiatorIndex.toString();
  };

  // Check if submit should be enabled
  const isSubmitDisabled = () => {
    return (
      !isConnected || !selectedGladiator || !information.trim() || isPending
    );
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-[#1C2128] border-0">
        <h3 className="text-lg font-semibold mb-4">
          Submit Information with Bribe
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Select Gladiator
            </label>
            <div className="grid grid-cols-2 gap-2">
              {gladiators.map((gladiator) => (
                <Button
                  key={gladiator.index.toString()}
                  variant={
                    isGladiatorSelected(gladiator.index) ? "default" : "outline"
                  }
                  onClick={() => handleGladiatorSelect(gladiator)}
                  className="w-full"
                >
                  {gladiator.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Information (max 160 chars)
            </label>
            <Input
              value={information}
              onChange={(e) => setInformation(e.target.value)}
              maxLength={160}
              placeholder="Enter your information..."
              className="bg-[#2D333B] border-0"
            />
            <div className="text-xs text-gray-400 mt-1">
              {information.length}/160 characters
            </div>
          </div>

          <Button
            className="w-full"
            disabled={isSubmitDisabled()}
            onClick={handleSubmit}
          >
            {!isConnected
              ? "Connect Wallet"
              : isPending
                ? "Submitting..."
                : "Submit Bribe (1 Token)"}
          </Button>
        </div>
      </Card>

      {/* Display existing bribes */}
      {typedBribesData && typedBribesData[0]?.length > 0 && (
        <Card className="p-4 bg-[#1C2128] border-0">
          <h3 className="text-lg font-semibold mb-4">Round Information</h3>
          <div className="space-y-3">
            {typedBribesData[0].map((address: string, index: number) => (
              <div key={index} className="p-3 bg-[#2D333B] rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">
                    From: {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                  <span className="text-gray-400">
                    {formatEther(typedBribesData[1][index])} tokens
                  </span>
                </div>
                <p className="text-sm">{typedBribesData[2][index]}</p>
                <div className="text-xs text-gray-400 mt-1">
                  Supporting:{" "}
                  {
                    gladiators.find(
                      (g) =>
                        g.index.toString() ===
                        typedBribesData[4][index].toString()
                    )?.name
                  }
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
