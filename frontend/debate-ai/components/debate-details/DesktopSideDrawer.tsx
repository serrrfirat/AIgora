import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEther, formatAddress } from "@/lib/utils";

const BASIS_POINTS = 10000n;
type Gladiator = {
  aiAddress: string; // Address of the AI agent
  name: string; // Name of the gladiator
  index: bigint; // Index in gladiators array
  isActive: boolean; // Whether still in competition
  publicKey: string; // Public key for encrypted bribes
  tokenId: number; // Token ID of the NFT - making this required instead of optional
};

type DesktopSideDrawerProps = {
  setOrderType: React.Dispatch<React.SetStateAction<"buy" | "sell">>;
  indexedGladiators: Gladiator[];
  selectedGladiator: Gladiator | null;
  setSelectedGladiator: React.Dispatch<React.SetStateAction<Gladiator | null>>;
  handleAmountChange: (value: string) => void;
  amount: string;
  adjustAmount: (delta: number) => void;
  gladiatorPrices: bigint[] | undefined;
  gladiatorVolumes: bigint[] | undefined;
  totalVolume: bigint | undefined;
  orderType: string;
  potentialReturn: string;
  isConnected: boolean;
  isApproveConfirming: boolean;
  isApprovePending: boolean;
  isOrderPending: boolean;
  isOrderConfirming: boolean;
  handlePlaceLimitOrder: (
    outcomeIndex: bigint,
    isLong: boolean
  ) => Promise<void>;
  isActive: boolean;
};

const DesktopSideDrawer = ({
  setOrderType,
  indexedGladiators,
  selectedGladiator,
  setSelectedGladiator,
  handleAmountChange,
  amount,
  adjustAmount,
  gladiatorPrices,
  gladiatorVolumes,
  totalVolume,
  orderType,
  potentialReturn,
  isConnected,
  isApproveConfirming,
  isApprovePending,
  isOrderPending,
  isOrderConfirming,
  handlePlaceLimitOrder,
  isActive,
}: DesktopSideDrawerProps) => {
  const totalVolumeFormatted = formatEther(totalVolume || 0n);

  return (
    <div>
      <div className="hidden md:block h-full">
        <Card className="bg-[#52362B] absolute h-[450px] w-[350px] width-debate-sidebar border-4 border-[#52362B] top-[100px]">
          <ScrollArea className="h-full " style={{ scrollbarWidth: "none" }}>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Order Type Tabs */}
                <Tabs
                  defaultValue="buy"
                  onValueChange={(v) => setOrderType(v as "buy" | "sell")}
                  className="w-full"
                >
                  <TabsList className="w-full grid grid-cols-2 text-white bg-[#1a212b]/50">
                    <TabsTrigger
                      value="buy"
                      className="data-[state=active]:bg-[#D1BB9E] data-[state=active]:text-[#3D3D3D]"
                    >
                      Buy
                    </TabsTrigger>
                    <TabsTrigger
                      value="sell"
                      className="data-[state=active]:bg-[#D1BB9E] data-[state=active]:text-[#3D3D3D]"
                    >
                      Sell
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Gladiator Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Gladiator
                  </label>
                  <div className="flex flex-col gap-2">
                    {indexedGladiators.map((gladiator, index) => {
                      if (!gladiator) return null;

                      return (
                        <Button
                          key={index}
                          variant={
                            selectedGladiator?.index === gladiator.index
                              ? "default"
                              : "outline"
                          }
                          className={`w-full justify-start transition-all ${
                            selectedGladiator?.index === gladiator.index
                              ? "bg-[#D1BB9E] hover:bg-[#D1BB9E]/90 text-[#3D3D3D]"
                              : "bg-[#D1BB9E]/50 hover:text-white text-white hover:bg-[#D1BB9E] border-[#D1BB9E]/30"
                          }`}
                          onClick={() => {
                            setSelectedGladiator(gladiator);
                            console.log("gladiator", gladiator);
                          }}
                        >
                          {gladiator.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">
                    Amount
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white">
                      $
                    </div>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="pl-6 bg-[#D1BB9E]/50 border-[#D1BB9E]/30 focus:border-[#D1BB9E] text-white focus:ring-[#D1BB9E]/20"
                      min="0"
                      step="0.1"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => adjustAmount(-0.1)}
                        className="h-6 w-6 p-0 hover:bg-[#D1BB9E]/20 text-gray-300"
                      >
                        -
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => adjustAmount(0.1)}
                        className="h-6 w-6 p-0 hover:bg-[#D1BB9E]/20 text-gray-300"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 bg-[#D1BB9E]/50 p-4 rounded-lg border border-[#D1BB9E]/30">
                  <div className="flex justify-between text-sm">
                    <span className="text-white">Avg price</span>
                    <span className="text-[#3D3D3D] font-medium">
                      {selectedGladiator &&
                      gladiatorPrices &&
                      gladiatorVolumes &&
                      totalVolumeFormatted
                        ? (() => {
                            const volume = formatEther(
                              gladiatorVolumes[Number(selectedGladiator.index)]
                            );
                            const impliedProbability =
                              totalVolumeFormatted !== "0"
                                ? Number(volume) / Number(totalVolumeFormatted)
                                : Number(
                                    gladiatorPrices[
                                      Number(selectedGladiator.index)
                                    ]
                                  ) / Number(BASIS_POINTS);
                            return orderType === "sell"
                              ? `${(1 - impliedProbability).toFixed(2)}¢`
                              : `${impliedProbability.toFixed(2)}¢`;
                          })()
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white">Shares</span>
                    <span className="text-[#3D3D3D] font-medium">
                      {selectedGladiator &&
                      gladiatorPrices &&
                      gladiatorVolumes &&
                      totalVolumeFormatted &&
                      parseFloat(amount)
                        ? (() => {
                            const volume = formatEther(
                              gladiatorVolumes[Number(selectedGladiator.index)]
                            );
                            const impliedProbability =
                              totalVolumeFormatted !== "0"
                                ? Number(volume) / Number(totalVolumeFormatted)
                                : Number(
                                    gladiatorPrices[
                                      Number(selectedGladiator.index)
                                    ]
                                  ) / Number(BASIS_POINTS);
                            const avgPrice =
                              orderType === "sell"
                                ? 1 - impliedProbability
                                : impliedProbability;
                            return (parseFloat(amount) / avgPrice).toFixed(2);
                          })()
                        : "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white">Potential return</span>
                    <span className="text-emerald-400 font-medium">
                      ${potentialReturn} (
                      {(
                        (parseFloat(potentialReturn) /
                          parseFloat(amount || "1")) *
                          100 || 0
                      ).toFixed(2)}
                      %)
                    </span>
                  </div>
                </div>

                {/* Place Order Button */}
                <Button
                  className={`w-full ${
                    !isConnected ||
                    !selectedGladiator ||
                    parseFloat(amount) <= 0 ||
                    !isActive
                      ? "opacity-50 cursor-not-allowed"
                      : "bg-[#D1BB9E] hover:bg-[#D1BB9E]/90"
                  }`}
                  disabled={
                    !isConnected ||
                    !isActive ||
                    !selectedGladiator ||
                    parseFloat(amount) <= 0 ||
                    isApprovePending ||
                    isApproveConfirming ||
                    isOrderPending ||
                    isOrderConfirming
                  }
                  onClick={() => {
                    console.log(
                      "selectedGladiator with index",
                      selectedGladiator?.index
                    );
                    if (typeof selectedGladiator?.index === "undefined") {
                      console.error("No gladiator selected or invalid index");
                      return;
                    }
                    handlePlaceLimitOrder(
                      selectedGladiator.index, // This is the outcomeIndex
                      orderType === "buy"
                    );
                  }}
                >
                  {!isConnected
                    ? "Connect Wallet"
                    : !isActive
                      ? "Debate Ended"
                      : !selectedGladiator
                        ? "Select Outcome"
                        : parseFloat(amount) <= 0
                          ? "Enter Amount"
                          : isApprovePending || isApproveConfirming
                            ? "Approving..."
                            : isOrderPending || isOrderConfirming
                              ? "Placing Order..."
                              : `Place ${orderType === "buy" ? "Buy" : "Sell"} Order`}
                </Button>

                <p className="text-xs text-white text-center">
                  By trading, you agree to the Terms of Use.
                </p>
              </div>
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default DesktopSideDrawer;
