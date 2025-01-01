'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI, MARKET_FACTORY_ADDRESS, MARKET_FACTORY_ABI } from '@/config/contracts';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, formatAddress } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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

type MarketDetails = [
  string,      // token
  bigint,      // debateId
  boolean,     // resolved
  bigint,      // winningOutcome
  [            // bondingCurve
    bigint,    // target
    bigint,    // current
    bigint,    // basePrice
    bigint,    // currentPrice
    boolean,   // isFulfilled
    bigint     // endTime
  ],
  bigint       // totalBondingAmount
];

type Outcome = {
  name: string;
  index: bigint;
  isValid: boolean;
};

interface DebateViewProps {
  debateId: number;
}

export function DebateView({ debateId }: DebateViewProps) {
  const { isConnected } = useAccount();
  const [pendingTx, setPendingTx] = useState(false);

  // Get debate details
  const { data: debateDetails } = useReadContract({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getDebateDetails',
    args: [BigInt(debateId)],
  }) as { data: DebateDetails | undefined };

  // Get market details
  const { data: marketId } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'debateIdToMarketId',
    args: [BigInt(debateId)],
  });

  const { data: marketDetails } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getMarketDetails',
    args: marketId ? [marketId] : undefined,
  }) as { data: MarketDetails | undefined };

  // Get outcomes
  const { data: outcomes } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getOutcomes',
    args: marketId ? [marketId] : undefined,
  }) as { data: Outcome[] | undefined };

  // Get current prices
  const { data: currentPrices } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getCurrentPrice',
    args: marketId && outcomes ? [marketId, 0n] : undefined,
  });

  const { writeContract: placeLimitOrder, data: hash, error } = useWriteContract();
  const { writeContract: approveToken, data: approveHash, error: approveError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isOrderSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const { isLoading: isConfirmingApprove, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  useEffect(() => {
    if (!isConfirming || error) {
      setPendingTx(false);
    }
  }, [isConfirming, error]);

  const handlePlaceLimitOrder = async (outcomeIndex: bigint, isLong: boolean) => {
    console.log('Button clicked', { outcomeIndex, isLong });
    
    if (!marketId || !marketDetails) {
      console.error('Market data not loaded:', { 
        marketId: marketId, 
        hasMarketDetails: !!marketDetails
      });
      return;
    }
    
    setPendingTx(true);
    try {
      // First approve the token
      const tokenContract = {
        address: marketDetails[0] as `0x${string}`, // token address from market details
        abi: [{
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ type: 'bool' }]
        }]
      };

      // Approve the market to spend tokens
      await approveToken({
        ...tokenContract,
        functionName: 'approve',
        args: [MARKET_FACTORY_ADDRESS, BigInt('1000000000000000000')]
      });

      const price = isLong ? bondingCurveData.basePrice : (10000n - bondingCurveData.basePrice);
      
      console.log('Attempting to place order with params:', {
        marketId,
        outcomeIndex,
        price,
        amount: BigInt('1000000000000000000')
      });
      
      // Then place the order
      await placeLimitOrder({
        address: MARKET_FACTORY_ADDRESS as `0x${string}`,
        abi: MARKET_FACTORY_ABI,
        functionName: 'placeLimitOrder',
        args: [
          marketId,
          outcomeIndex,
          price,
          BigInt('1000000000000000000')
        ]
      });
    } catch (error) {
      console.error('Error placing limit order:', error);
      setPendingTx(false);
    }
  };

  if (!debateDetails || !marketDetails || !outcomes || currentPrices === undefined) return <div>Loading market details...</div>;

  console.log('Market Details:', marketDetails);

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
  ] = debateDetails;

  // Extract market details as a tuple
  const [
    token,
    _debateId,
    resolved,
    winningOutcome,
    bondingCurveData,
    totalBondingAmount
  ] = marketDetails;

  console.log('Bonding Curve Data:', bondingCurveData);

  // Access bonding curve data directly as an object
  const {
    target,
    current,
    basePrice,
    currentPrice,
    isFulfilled,
    endTime
  } = bondingCurveData;

  const endDate = new Date(Number(debateEndTime) * 1000);
  const timeRemaining = Math.max(0, Number(debateEndTime) - Math.floor(Date.now() / 1000));
  const daysRemaining = Math.floor(timeRemaining / (24 * 60 * 60));
  const hoursRemaining = Math.floor((timeRemaining % (24 * 60 * 60)) / 3600);

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Bonding Curve Progress */}
      <Card className="bg-[#1C2128] border-0">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-gray-400">Bonding Curve Progress</div>
              <div className="text-sm font-medium">
                {formatEther(current)}/${formatEther(target)}
              </div>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (Number(current) * 100) / Number(target))}%`,
                  backgroundColor: isFulfilled ? '#3FB950' : '#2F81F7'
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <div>Current: ${formatEther(current)}</div>
              <div>Target: ${formatEther(target)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debate Information */}
      <Card className="bg-[#1C2128] border-0">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold mb-2">{topic}</h2>
                <div className="text-sm text-gray-400">Created by {formatAddress(creator)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {isActive ? (
                    <span className="text-green-400">Active</span>
                  ) : (
                    <span className="text-red-400">Ended</span>
                  )}
                </div>
                {isActive && (
                  <div className="text-sm text-gray-400">
                    {daysRemaining}d {hoursRemaining}h remaining
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-800">
              <div>
                <div className="text-sm text-gray-400">Total Volume</div>
                <div className="font-medium">${formatEther(totalBondingAmount)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Round</div>
                <div className="font-medium">{currentRound.toString()}/{totalRounds.toString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">End Date</div>
                <div className="font-medium">{endDate.toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Judges</div>
                <div className="font-medium">{judges.length}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outcomes List */}
      <Card className="bg-[#1C2128] border-0">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-400">OUTCOME</div>
            <div className="text-sm text-gray-400">% CHANCE ↻</div>
          </div>
          <div className="space-y-4">
            {outcomes?.map((outcome, i) => {
              const currentPrice = Number(currentPrices || 0n) / 100;
              const volume = formatEther(totalBondingAmount);
              
              return (
                <div key={i} className="border-t border-gray-800 pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{outcome.name}</div>
                      <div className="text-sm text-gray-400">${volume} Vol.</div>
                    </div>
                    <div className="text-xl font-medium">{currentPrice}%</div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 bg-[#1F3229] text-[#3FB950] border-[#238636] hover:bg-[#238636] hover:text-white"
                      onClick={() => handlePlaceLimitOrder(outcome.index, true)}
                      disabled={!isConnected || pendingTx || isConfirming || isOrderSuccess}
                    >
                      {pendingTx || isConfirming || isOrderSuccess ? 'Confirming...' : `Buy Yes ${(currentPrice/100).toFixed(1)}¢`}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 bg-[#3B2325] text-[#F85149] border-[#F85149] hover:bg-[#F85149] hover:text-white"
                      onClick={() => handlePlaceLimitOrder(outcome.index, false)}
                      disabled={!isConnected || pendingTx || isConfirming || isOrderSuccess}
                    >
                      {pendingTx || isConfirming || isOrderSuccess ? 'Confirming...' : `Buy No ${((100-currentPrice)/100).toFixed(1)}¢`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add the confirmation dialog */}
      <Dialog open={pendingTx || isConfirmingApprove || isConfirming} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-lg font-semibold">Transaction Being Processed</p>
            <p className="text-sm text-gray-500">
              {isConfirmingApprove 
                ? 'Approving token...' 
                : isConfirming 
                  ? 'Placing order...' 
                  : 'Preparing transaction...'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 