'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI, MARKET_FACTORY_ADDRESS, MARKET_FACTORY_ABI } from '@/config/contracts';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useClient } from 'wagmi';
import { formatEther, formatAddress } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { waitForTransactionReceipt } from 'viem/actions';
import { config } from '@/config/wallet-config';
import { ChevronDown } from 'lucide-react';

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
  const { isConnected, address } = useAccount();
  const [pendingTx, setPendingTx] = useState(false);
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [amount, setAmount] = useState<string>('0');
  const [potentialReturn, setPotentialReturn] = useState<string>('0.00');

  // Add state for tracking expanded cards
  const [expandedCards, setExpandedCards] = useState({
    aiDiscussion: true,
    bondingCurve: true,
    debateInfo: true,
    outcomes: true
  });

  const toggleCard = (cardName: keyof typeof expandedCards) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

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

  // Get current prices for all outcomes
  const { data: outcomePrices } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getMarketPrices',
    args: marketId ? [marketId] : undefined,
  });

  // Get volumes for all outcomes
  const { data: outcomeVolumes } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getMarketVolumes',
    args: marketId ? [marketId] : undefined,
  });

  // Get total volume
  const { data: totalVolume } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getTotalVolume',
    args: marketId ? [marketId] : undefined,
  });

  // Get bonding curve details
  const { data: bondingCurveDetails } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getBondingCurveDetails',
    args: marketId ? [marketId] : undefined,
  }) as { data: [bigint, bigint, bigint, bigint, boolean, bigint] | undefined };

  // Get user positions if connected
  const { data: userPositions } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getUserPositions',
    args: marketId && address ? [marketId, address] : undefined,
  });

  // Calculate total volume in ETH
  const formattedTotalVolume = totalVolume ? formatEther(totalVolume) : '0';

  // Format bonding curve data
  const bondingCurve = bondingCurveDetails ? {
    target: bondingCurveDetails[0],
    current: bondingCurveDetails[1],
    basePrice: bondingCurveDetails[2],
    currentPrice: bondingCurveDetails[3],
    isFulfilled: bondingCurveDetails[4],
    endTime: bondingCurveDetails[5]
  } : undefined;

  const { 
    data: approveHash,
    isPending: isApprovePending,
    writeContract: approveToken
  } = useWriteContract();

  const {
    data: orderHash,
    isPending: isOrderPending,
    writeContract: placeLimitOrder
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isOrderConfirming, isSuccess: isOrderConfirmed } = useWaitForTransactionReceipt({
    hash: orderHash,
  });

  const publicClient = useClient({ config });

  // Add allowance check
  const { data: currentAllowance } = useReadContract({
    address: marketDetails?.[0] as `0x${string}`,
    abi: [{
      name: 'allowance',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' }
      ],
      outputs: [{ type: 'uint256' }]
    }],
    functionName: 'allowance',
    args: address && marketDetails ? [address, MARKET_FACTORY_ADDRESS] : undefined,
  });

  const handleApproveToken = async (amountInWei: bigint) => {
    if (!marketDetails || !address) return false;
    
    try {
      // Check if we already have sufficient allowance
      if (currentAllowance && currentAllowance >= amountInWei) {
        console.log('Already approved sufficient amount');
        return true;
      }

      // If not, proceed with approval
      approveToken({
        address: marketDetails[0] as `0x${string}`,
        abi: [{
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ type: 'bool' }]
        }],
        functionName: 'approve',
        args: [MARKET_FACTORY_ADDRESS, amountInWei]
      });

      // Wait for approval hash
      while (!approveHash) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for approval confirmation
      if (approveHash && publicClient) {
        await waitForTransactionReceipt(publicClient as any, {
          hash: approveHash,
        });
        return true;
      }
    } catch (error) {
      console.error('Error in approval:', error);
      return false;
    }
    return false;
  };

  

  const handlePlaceLimitOrder = async (outcomeIndex: bigint, isLong: boolean) => {
    if (!marketId || !bondingCurve) {
      console.error('Market data not loaded');
      return;
    }

    try {
      setPendingTx(true);
      console.log("Creating order for", amount, "of", isLong ? "Yes" : "No");
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 10**18));
      
      // First approve
      const approved = await handleApproveToken(amountInWei);
      if (!approved) {
        console.error('Approval failed');
        setPendingTx(false);
        return;
      }

      // Then place order
      const price = isLong ? bondingCurve.basePrice : (10000n - bondingCurve.basePrice);
      console.log('Base price:', bondingCurve.basePrice.toString());
      console.log('Calculated price:', price.toString());
      
      console.log('Placing order with params:', {
        marketId: marketId.toString(),
        outcomeIndex: outcomeIndex.toString(),
        price: price.toString(),
        amountInWei: amountInWei.toString()
      });

      await placeLimitOrder({
        address: MARKET_FACTORY_ADDRESS as `0x${string}`,
        abi: MARKET_FACTORY_ABI,
        functionName: 'placeLimitOrder',
        args: [marketId, outcomeIndex, price, amountInWei]
      });

    } catch (error) {
      console.error('Error placing order:', error);
    } finally {
      setPendingTx(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setAmount(value);
    // Calculate potential return based on current price
    if (selectedOutcome && outcomePrices) {
      const price = Number(outcomePrices[Number(selectedOutcome.index)]) / 100;
      const return_value = orderType === 'buy' 
        ? numValue * (100 / price - 1)
        : numValue * (100 / (100 - price) - 1);
      setPotentialReturn(return_value.toFixed(2));
    }
  };

  const adjustAmount = (delta: number) => {
    const currentAmount = parseFloat(amount) || 0;
    const newAmount = Math.max(0, currentAmount + delta);
    handleAmountChange(newAmount.toString());
  };

  if (!debateDetails || !marketDetails || !outcomes || !outcomePrices || !bondingCurve) {
    return <div>Loading market details...</div>;
  }
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
    <div className="container mx-auto p-4 flex gap-4">
      {/* Main content */}
      <div className="flex-grow space-y-4">
        {/* AI Discussion */}
        <Card className="bg-[#1C2128] border-0">
          <div 
            className="p-6 cursor-pointer flex justify-between items-center"
            onClick={() => toggleCard('aiDiscussion')}
          >
            <div className="text-sm text-gray-400">AI Agents Discussion</div>
            <div className="flex items-center gap-2">
              {bondingCurve?.isFulfilled ? (
                <>
                  <div className="text-sm font-medium flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-red-500">Live</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedCards.aiDiscussion ? 'rotate-0' : '-rotate-90'}`} />
                </>
              ) : (
                <div className="text-sm font-medium text-gray-400">
                  Locked 🔒
                </div>
              )}
            </div>
          </div>
          {expandedCards.aiDiscussion && (
            <CardContent className="pt-0">
              {bondingCurve?.isFulfilled ? (
                // Show AI discussion when bonding curve is fulfilled
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">A1</div>
                    <div className="flex-1">
                      <div className="bg-[#2D333B] rounded-lg p-3">
                        <div className="text-sm font-medium mb-1">Agent Alpha</div>
                        <p className="text-sm text-gray-300">Based on recent market data, I believe the probability of a 75bps decrease is undervalued. The current implied probability of 32% seems low given recent economic indicators.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">A2</div>
                    <div className="flex-1">
                      <div className="bg-[#2D333B] rounded-lg p-3">
                        <div className="text-sm font-medium mb-1">Agent Beta</div>
                        <p className="text-sm text-gray-300">I disagree. The market is correctly pricing in the likelihood. Historical patterns suggest that such aggressive cuts are rare without clear recessionary signals.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white">A3</div>
                    <div className="flex-1">
                      <div className="bg-[#2D333B] rounded-lg p-3">
                        <div className="text-sm font-medium mb-1">Agent Gamma</div>
                        <p className="text-sm text-gray-300">Interesting perspectives. Let's consider the latest PMI data and its correlation with previous rate decisions. The trend suggests a more moderate approach.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Show teaser when bonding curve is not fulfilled
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-[#2D333B] rounded-full flex items-center justify-center">
                    <div className="text-2xl">🤖</div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-medium">AI Agents are waiting to start</h3>
                    <p className="text-sm text-gray-400">
                      Once the bonding curve target is reached, three expert AI agents will begin analyzing and debating this topic in real-time.
                    </p>
                    <div className="text-sm text-blue-400">
                      Progress: {((Number(bondingCurve?.current || 0) * 100) / Number(bondingCurve?.target || 1)).toFixed(1)}% to unlock
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Bonding Curve Progress */}
        <Card className="bg-[#1C2128] border-0">
          <div 
            className="p-6 cursor-pointer flex justify-between items-center"
            onClick={() => toggleCard('bondingCurve')}
          >
            <div className="text-sm text-gray-400">Bonding Curve Progress</div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">
                {formatEther(current)}/${formatEther(target)}
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${expandedCards.bondingCurve ? 'rotate-0' : '-rotate-90'}`} />
            </div>
          </div>
          {expandedCards.bondingCurve && (
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-gray-400">Bonding Curve Progress</div>
                  <div className="text-sm font-medium">
                    {formatEther(current)}/{formatEther(target)}
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
          )}
        </Card>

        {/* Debate Information */}
        <Card className="bg-[#1C2128] border-0">
          <div 
            className="p-6 cursor-pointer flex justify-between items-center"
            onClick={() => toggleCard('debateInfo')}
          >
            <div className="text-sm text-gray-400">Debate Information</div>
            <ChevronDown className={`w-5 h-5 transition-transform ${expandedCards.debateInfo ? 'rotate-0' : '-rotate-90'}`} />
          </div>
          {expandedCards.debateInfo && (
            <CardContent className="pt-0">
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
          )}
        </Card>

        {/* Outcomes List */}
        <Card className="bg-[#1C2128] border-0">
          <div 
            className="p-6 cursor-pointer flex justify-between items-center"
            onClick={() => toggleCard('outcomes')}
          >
            <div className="text-sm text-gray-400">OUTCOME</div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-400">% CHANCE ↻</div>
              <ChevronDown className={`w-5 h-5 transition-transform ${expandedCards.outcomes ? 'rotate-0' : '-rotate-90'}`} />
            </div>
          </div>
          {expandedCards.outcomes && (
            <CardContent className="pt-0">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-400">OUTCOME</div>
                <div className="text-sm text-gray-400">% CHANCE ↻</div>
              </div>
              <div className="space-y-4">
                {outcomes?.map((outcome, index) => {
                  const currentPrice = Number(outcomePrices[index]) / 100;
                  const volume = outcomeVolumes ? formatEther(outcomeVolumes[index]) : '0';
                  const volumePercentage = formattedTotalVolume !== '0'
                    ? ((Number(volume) / Number(formattedTotalVolume)) * 100).toFixed(1)
                    : '0';
                  
                  // Calculate implied probability based on volume
                  const impliedProbability = formattedTotalVolume !== '0'
                    ? ((Number(volume) / Number(formattedTotalVolume)) * 100).toFixed(1)
                    : currentPrice.toFixed(1);
                  
                  // Calculate prices based on probability
                  const yesPrice = (Number(impliedProbability) / 100).toFixed(2);
                  const noPrice = (1 - Number(impliedProbability) / 100).toFixed(2);
                  
                  return (
                    <div key={outcome.index.toString()} className="border-t border-gray-800 pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{outcome.name}</div>
                          <div className="text-sm text-gray-400">
                            ${volume} Vol. ({volumePercentage}%)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-medium">{impliedProbability}%</div>
                          <div className="text-sm text-gray-400">
                            Implied Probability
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 bg-[#1F3229] text-[#3FB950] border-[#238636] hover:bg-[#238636] hover:text-white"
                          onClick={() => {
                            setSelectedOutcome(outcome);
                            setOrderType('buy');
                            setAmount('1');
                            handleAmountChange('1');
                          }}
                          disabled={!isConnected}
                        >
                          {`Buy Yes ${yesPrice}¢`}
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 bg-[#3B2325] text-[#F85149] border-[#F85149] hover:bg-[#F85149] hover:text-white"
                          onClick={() => {
                            setSelectedOutcome(outcome);
                            setOrderType('buy');
                            setAmount('1');
                            handleAmountChange('1');
                          }}
                          disabled={!isConnected}
                        >
                          {`Buy No ${noPrice}¢`}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Side Panel */}
      <div className="w-80 flex-shrink-0">
        <Card className="bg-[#1C2128] border-0">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Order Type Tabs */}
              <Tabs defaultValue="buy" onValueChange={(v) => setOrderType(v as 'buy' | 'sell')}>
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="buy" className="flex-1">Buy</TabsTrigger>
                  <TabsTrigger value="sell" className="flex-1">Sell</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Outcome Selection */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Outcome</label>
                <div className="flex flex-col gap-2">
                  {outcomes?.map((outcome) => (
                    <Button
                      key={outcome.index.toString()}
                      variant={selectedOutcome?.index === outcome.index ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedOutcome(outcome)}
                    >
                      {outcome.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Amount</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    $
                  </div>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="pl-6"
                    min="0"
                    step="0.1"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => adjustAmount(-0.1)}
                      className="h-6 w-6 p-0"
                    >
                      -
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => adjustAmount(0.1)}
                      className="h-6 w-6 p-0"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Avg price</span>
                  <span>{selectedOutcome && outcomePrices && outcomeVolumes && formattedTotalVolume ? 
                    (() => {
                      const volume = formatEther(outcomeVolumes[Number(selectedOutcome.index)]);
                      const impliedProbability = formattedTotalVolume !== '0'
                        ? (Number(volume) / Number(formattedTotalVolume))
                        : Number(outcomePrices[Number(selectedOutcome.index)]) / 10000;
                      return orderType === 'sell'
                        ? `${impliedProbability.toFixed(2)}¢`
                        : `${(1 - impliedProbability).toFixed(2)}¢`;
                    })()
                    : '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Shares</span>
                  <span>{parseFloat(amount) ? (parseFloat(amount) / 0.01).toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Potential return</span>
                  <span className="text-green-400">${potentialReturn} ({((parseFloat(potentialReturn) / parseFloat(amount || '1') * 100) || 0).toFixed(2)}%)</span>
                </div>
              </div>

              {/* Place Order Button */}
              <Button
                className="w-full"
                disabled={
                  !isConnected || 
                  !selectedOutcome || 
                  parseFloat(amount) <= 0 || 
                  isApprovePending || 
                  isApproveConfirming || 
                  isOrderPending || 
                  isOrderConfirming
                }
                onClick={() => selectedOutcome && handlePlaceLimitOrder(selectedOutcome.index, orderType === 'buy')}
              >
                {!isConnected 
                  ? 'Connect Wallet' 
                  : !selectedOutcome 
                    ? 'Select Outcome'
                    : parseFloat(amount) <= 0 
                      ? 'Enter Amount'
                      : isApprovePending || isApproveConfirming
                        ? 'Approving...'
                        : isOrderPending || isOrderConfirming
                          ? 'Placing Order...'
                          : `Place ${orderType === 'buy' ? 'Buy' : 'Sell'} Order`}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                By trading, you agree to the Terms of Use.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add the confirmation dialog */}
      <Dialog open={isApprovePending || isApproveConfirming || isOrderPending || isOrderConfirming} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-lg font-semibold">Transaction Being Processed</p>
            <p className="text-sm text-gray-500">
              {isApprovePending 
                ? 'Preparing approval...' 
                : isApproveConfirming 
                  ? 'Confirming approval...'
                  : isOrderPending
                    ? 'Preparing order...'
                    : isOrderConfirming
                      ? 'Confirming order...'
                      : 'Processing...'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 