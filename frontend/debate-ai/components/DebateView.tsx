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
import { BribeSubmission } from './BribeSubmission';

interface Message {
  sender: string;
  content: string;
  timestamp: string;
}

// Constants from the contract
const BASIS_POINTS = 10000n;
const MIN_PRICE = 1n; // $0.01 in basis points
const MAX_PRICE = 9900n; // $0.99 in basis points
const MIN_ORDER_SIZE = BigInt(10**18); // 1 full token

// Type definitions matching MarketFactory.sol structs
type BondingCurveStruct = {
  target: bigint;          // Target amount to reach
  current: bigint;         // Current amount raised
  basePrice: bigint;       // Starting price
  currentPrice: bigint;    // Current price
  isFulfilled: boolean;    // Whether target is reached
  endTime: bigint;         // When bonding period ends
};

// Type for how bonding curve is returned from contract
type BondingCurve = [
  bigint,    // target
  bigint,    // current
  bigint,    // basePrice
  bigint,    // currentPrice
  boolean,   // isFulfilled
  bigint     // endTime
];

type Gladiator = {
  aiAddress: string;      // Address of the AI agent
  name: string;           // Name of the gladiator
  index: bigint;         // Index in gladiators array
  isActive: boolean;     // Whether still in competition
  publicKey: string;     // Public key for encrypted bribes
};

type JudgeVerdict = {
  scores: bigint[];      // Scores for each gladiator
  timestamp: bigint;     // When verdict was given
};

type Round = {
  startTime: bigint;
  endTime: bigint;
  isComplete: boolean;
  verdict: JudgeVerdict;
};

type Order = {
  price: bigint;        // Price in basis points (100 = 1%)
  amount: bigint;       // Amount of shares
  outcomeIndex: bigint; // Which outcome this order is for
  owner: string;        // Order creator
};

type Position = {
  shares: { [gladiatorIndex: string]: bigint }; // gladiatorIndex => number of shares
};

type Bribe = {
  briber: string;
  amount: bigint;
  information: string;
  timestamp: bigint;
  outcomeIndex: bigint;
};

// Return types for contract read functions
type MarketDetails = [
  string,      // token
  bigint,      // debateId
  boolean,     // resolved
  bigint,      // winningGladiator
  BondingCurve,// bondingCurve
  bigint       // totalBondingAmount
];

type RoundInfo = [
  bigint,      // roundIndex
  bigint,      // startTime
  bigint,      // endTime
  boolean      // isComplete
];

type LeaderboardInfo = [
  bigint[],    // totalScores
  bigint[]     // gladiatorIndexes
];

type DebateDetails = [
  topic: string,     // topic
  startTime: bigint,     // startTime
  duration: bigint,     // duration
  debateEndTime: bigint,     // debateEndTime
  currentRound: bigint,     // currentRound
  totalRounds: bigint,     // totalRounds
  isActive: boolean,    // isActive
  creator: string,     // creator
  market: string,     // market
  judges: string[],    // judges
  hasOutcome: boolean,    // hasOutcome
  finalOutcome: bigint      // finalOutcome
];

// Type for arrays that will be indexed
type GladiatorPrices = { [index: string]: bigint };
type GladiatorVolumes = { [index: string]: bigint };
type UserPositions = { [index: string]: bigint };

interface DebateViewProps {
  debateId: number;
}

// Add sorting function after Message interface
function sortMessagesByTimestamp(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA; // Sort in descending order (newest first)
  });
}

export function DebateView({ debateId }: DebateViewProps) {
  const { isConnected, address } = useAccount();
  const publicClient = useClient({ config });

  // Component state
  const [pendingTx, setPendingTx] = useState(false);
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [selectedGladiator, setSelectedGladiator] = useState<Gladiator | null>(null);
  const [amount, setAmount] = useState<string>('0');
  const [potentialReturn, setPotentialReturn] = useState<string>('0.00');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  // Transaction state
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


  
  // Effect for handling order confirmation
  useEffect(() => {
    if (isOrderConfirmed) {
      console.log('Order confirmed, refreshing data...');
      // Reset form
      setAmount('0');
      setPotentialReturn('0.00');
      setSelectedGladiator(null);
      
      // Refetch all data
      refetchAllData();
    }
  }, [isOrderConfirmed]);

  // Add state for tracking expanded cards
  const [expandedCards, setExpandedCards] = useState({
    aiDiscussion: true,
    bondingCurve: true,
    debateInfo: true,
    gladiators: true,
    leaderboard: true
  });

  const toggleCard = (cardName: keyof typeof expandedCards) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };


  /// Get Debate Details
  const { data: debateDetails, refetch: refetchDebateDetails } = useReadContract({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getDebateDetails',
    args: [BigInt(debateId)],
  }) as { data: DebateDetails | undefined, refetch: () => void };

  // Get market ID from debate ID
  const { data: marketId, refetch: refetchMarketId } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'debateIdToMarketId',
    args: [BigInt(debateId)],
  });

  // Log market ID changes
  useEffect(() => {
    console.log('[DebateView] marketId changed:', marketId?.toString());
  }, [marketId]);

  // Get market details
  const { data: marketDetails, refetch: refetchMarketDetails } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getMarketDetails',
    args: marketId ? [marketId] : undefined,
  }) as { data: MarketDetails | undefined, refetch: () => void };

  // Get gladiators
  const { data: gladiators, refetch: refetchGladiators } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getGladiators',
    args: marketId ? [marketId] : undefined,
  }) as { data: Gladiator[] | undefined, refetch: () => void };

  // Get round info
  const { data: roundInfo, refetch: refetchRoundInfo } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getCurrentRound',
    args: marketId ? [marketId] : undefined,
  }) as { data: RoundInfo | undefined, refetch: () => void };

  // Get leaderboard
  const { data: leaderboard, refetch: refetchLeaderboard } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getLeaderboard',
    args: marketId ? [marketId] : undefined,
  }) as { data: LeaderboardInfo | undefined, refetch: () => void };

  // Get market prices
  const { data: gladiatorPrices, refetch: refetchPrices } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getMarketPrices',
    args: marketId ? [marketId] : undefined,
  }) as { data: bigint[] | undefined, refetch: () => void };

  // Get market volumes
  const { data: gladiatorVolumes, refetch: refetchVolumes } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getMarketVolumes',
    args: marketId ? [marketId] : undefined,
  }) as { data: bigint[] | undefined, refetch: () => void };

  // Get total volume
  const { data: totalVolume, refetch: refetchTotalVolume } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getTotalVolume',
    args: marketId ? [marketId] : undefined,
  }) as { data: bigint | undefined, refetch: () => void };

  // Get bonding curve details
  const { data: bondingCurveDetails, refetch: refetchBondingCurve } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getBondingCurveDetails',
    args: marketId ? [marketId] : undefined,
  }) as { data: BondingCurve | undefined, refetch: () => void };

  // Get user positions if connected
  const { data: userPositions } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getUserPositions',
    args: marketId && address ? [marketId, address] : undefined,
  }) as { data: bigint[] | undefined };


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

    // Add state for chat messages

  // Effect to fetch and subscribe to chat messages
  useEffect(() => {
    console.log("[DebateView] Chat effect triggered with marketId:", marketId?.toString());
    if (!marketId) {
      console.log("[DebateView] No valid marketId yet");
      return;
    }

    // Convert marketId to bigint to ensure type safety
    const marketIdBigInt = BigInt(marketId.toString());

    let ws: WebSocket;
    let isWsConnected = false;

    const fetchMessages = async () => {
      try {
        console.log("[DebateView] Fetching messages for market:", marketIdBigInt.toString());
        const response = await fetch(`/api/chat/${marketIdBigInt}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Request-Time': Date.now().toString()
          },
          cache: 'no-store',
          next: { revalidate: 0 }
        });
        if (!response.ok) {
          console.error("[DebateView] HTTP error from API:", response.status, response.statusText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const messages = await response.json();
        if ('error' in messages) {
          console.error("[DebateView] API returned error:", messages.error);
          return;
        }
        console.log("[DebateView] Received messages:", messages);
        setChatMessages(sortMessagesByTimestamp(messages));
      } catch (error) {
        console.error('[DebateView] Error fetching chat messages:', error);
      }
    };

    // Set up WebSocket connection
    const setupWebSocket = () => {
      if (!process.env.NEXT_PUBLIC_WS_URL) {
        console.error("[DebateView] NEXT_PUBLIC_WS_URL not set");
        return;
      }

      console.log("[DebateView] Setting up WebSocket for market:", marketIdBigInt.toString());
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/chat/${marketIdBigInt}`;
      console.log("[DebateView] WebSocket URL:", wsUrl);
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("[DebateView] WebSocket connected");
        isWsConnected = true;
        // Fetch messages after WebSocket is connected
        fetchMessages();
      };

      ws.onerror = (error) => {
        console.error("[DebateView] WebSocket error:", error);
        isWsConnected = false;
      };
      
      ws.onclose = () => {
        console.log("[DebateView] WebSocket closed");
        isWsConnected = false;
        // Try to reconnect after a delay
        setTimeout(() => {
          if (!isWsConnected) {
            console.log("[DebateView] Attempting to reconnect WebSocket...");
            setupWebSocket();
          }
        }, 3000);
      };
      
      ws.onmessage = (event) => {
        console.log("[DebateView] Received WebSocket message:", event.data);
        try {
          const message = JSON.parse(event.data);
          setChatMessages(prev => sortMessagesByTimestamp([message, ...prev]));
        } catch (error) {
          console.error("[DebateView] Error parsing WebSocket message:", error);
        }
      };
    };

    // Start WebSocket connection
    setupWebSocket();

    return () => {
      console.log("[DebateView] Cleaning up WebSocket connection");
      isWsConnected = false;
      if (ws) {
        ws.close();
      }
    };
  }, [marketId]);

  // Function to refetch all data
  const refetchAllData = async () => {
    await Promise.all([
      refetchMarketId(),
      refetchMarketDetails(),
      refetchGladiators(),
      refetchRoundInfo(),
      refetchLeaderboard(),
      refetchPrices(),
      refetchVolumes(),
      refetchTotalVolume(),
      refetchBondingCurve(),
      refetchDebateDetails()
    ]);
  };

  // Extract debate details
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
  ] = debateDetails || [];

  // Loading check for market data
  const isMarketDataLoading = !marketDetails || !gladiators || !gladiatorPrices || !bondingCurveDetails || !debateDetails;

  // Format total volume
  const totalVolumeFormatted = formatEther(totalVolume || 0n);

  // Calculate end date
  const endDate = debateEndTime ? new Date(Number(debateEndTime) * 1000) : new Date();

  // Format bonding curve data
  const bondingCurve = bondingCurveDetails ? {
    target: bondingCurveDetails[0],
    current: bondingCurveDetails[1],
    basePrice: bondingCurveDetails[2],
    currentPrice: bondingCurveDetails[3],
    isFulfilled: bondingCurveDetails[4],
    endTime: bondingCurveDetails[5]
  } : null;

  // Extract round info
  const [roundIndex, roundStartTime, roundEndTime, isRoundComplete] = roundInfo || [0n, 0n, 0n, false];

  // Calculate time remaining
  const timeRemaining = bondingCurve ? Math.max(0, Number(bondingCurve.endTime) - Math.floor(Date.now() / 1000)) : 0;
  const daysRemaining = Math.floor(timeRemaining / (24 * 60 * 60));
  const hoursRemaining = Math.floor((timeRemaining % (24 * 60 * 60)) / 3600);



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
    if (selectedGladiator && gladiatorPrices) {
      const price = Number(gladiatorPrices[Number(selectedGladiator.index)]) / 100;
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

  console.log("marketDetails", marketDetails);
  console.log("gladiators", gladiators);
  console.log("gladiatorPrices", gladiatorPrices);
  console.log("bondingCurveDetails", bondingCurveDetails);
  console.log("debateDetails", debateDetails);

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
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {chatMessages.map((message, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        {message.sender.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="bg-[#2D333B] rounded-lg p-3">
                          <div className="text-sm font-medium mb-1">{message.sender}</div>
                          <p className="text-sm text-gray-300">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
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
                      Progress: {bondingCurve ? ((Number(bondingCurve.current) * 100) / Number(bondingCurve.target)).toFixed(1) : '0'}% to unlock
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Rest of the components */}
        {isMarketDataLoading ? (
          <div>Loading market details...</div>
        ) : (
          <>
            {/* Bribe Submission */}
            {bondingCurve?.isFulfilled && marketId && (
              <BribeSubmission
                marketId={BigInt(marketId.toString())}
                roundId={roundIndex}
                gladiators={gladiators}
                onBribeSubmitted={refetchAllData}
              />
            )}

            {/* Bonding Curve Progress */}
            <Card className="bg-[#1C2128] border-0">
              <div 
                className="p-6 cursor-pointer flex justify-between items-center"
                onClick={() => toggleCard('bondingCurve')}
              >
                <div className="text-sm text-gray-400">Bonding Curve Progress</div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">
                    {formatEther(bondingCurve?.current || 0n)}/${formatEther(bondingCurve?.target || 0n)}
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
                        {formatEther(bondingCurve?.current || 0n)}/{formatEther(bondingCurve?.target || 0n)}
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(100, (Number(bondingCurve?.current || 0n) * 100) / Number(bondingCurve?.target || 0n))}%`,
                          backgroundColor: bondingCurve?.isFulfilled ? '#3FB950' : '#2F81F7'
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <div>Current: ${formatEther(bondingCurve?.current || 0n)}</div>
                      <div>Target: ${formatEther(bondingCurve?.target || 0n)}</div>
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
                        <h2 className="text-xl font-bold mb-2">{topic || 'Loading...'}</h2>
                        <div className="text-sm text-gray-400">Created by {formatAddress(creator || '')}</div>
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
                        <div className="font-medium">${totalVolumeFormatted}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Round</div>
                        <div className="font-medium">{currentRound?.toString() || '0'}/{totalRounds?.toString() || '0'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">End Date</div>
                        <div className="font-medium">{endDate.toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Judges</div>
                        <div className="font-medium">{judges?.length || 0}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Gladiator List */}
            <Card className="bg-[#1C2128] border-0">
              <div 
                className="p-6 cursor-pointer flex justify-between items-center"
                onClick={() => toggleCard('gladiators')}
              >
                <div className="text-sm text-gray-400">GLADIATOR</div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-400">% CHANCE ↻</div>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedCards.gladiators ? 'rotate-0' : '-rotate-90'}`} />
                </div>
              </div>
              {expandedCards.gladiators && (
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-gray-400">GLADIATOR</div>
                    <div className="text-sm text-gray-400">% CHANCE ↻</div>
                  </div>
                  <div className="space-y-4">
                    {gladiators?.map((gladiator, index) => {
                      const currentPrice = Number(gladiatorPrices?.[index] || 0n) / Number(BASIS_POINTS);
                      const volume = gladiatorVolumes ? formatEther(gladiatorVolumes[index]) : '0';
                      const totalVolumeFormatted = formatEther(totalVolume || 0n);
                      const volumePercentage = totalVolumeFormatted !== '0'
                        ? ((Number(volume) / Number(totalVolumeFormatted)) * 100).toFixed(1)
                        : '0';
                      
                      // Calculate implied probability based on volume
                      const impliedProbability = totalVolumeFormatted !== '0'
                        ? ((Number(volume) / Number(totalVolumeFormatted)) * 100).toFixed(1)
                        : currentPrice.toFixed(1);
                      
                      // Calculate prices based on probability
                      const yesPrice = (Number(impliedProbability) / 100).toFixed(2);
                      const noPrice = (1 - Number(impliedProbability) / 100).toFixed(2);
                      
                      return (
                        <div key={gladiator.index.toString()} className="border-t border-gray-800 pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium">{gladiator.name}</div>
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
                                setSelectedGladiator(gladiator);
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
                                setSelectedGladiator(gladiator);
                                setOrderType('sell');
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
          </>
        )}
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

              {/* Gladiator Selection */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Gladiator</label>
                <div className="flex flex-col gap-2">
                  {gladiators?.map((gladiator) => (
                    <Button
                      key={gladiator.index.toString()}
                      variant={selectedGladiator?.index === gladiator.index ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedGladiator(gladiator)}
                    >
                      {gladiator.name}
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
                  <span>{selectedGladiator && gladiatorPrices && gladiatorVolumes && totalVolumeFormatted ? 
                    (() => {
                      const volume = formatEther(gladiatorVolumes[Number(selectedGladiator.index)]);
                      const impliedProbability = totalVolumeFormatted !== '0' 
                        ? (Number(volume) / Number(totalVolumeFormatted))
                        : Number(gladiatorPrices[Number(selectedGladiator.index)]) / Number(BASIS_POINTS);
                      return orderType === 'sell'
                        ? `${impliedProbability.toFixed(2)}¢`
                        : `${(1 - impliedProbability).toFixed(2)}¢`;
                    })()
                    : '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Shares</span>
                  <span>{selectedGladiator && gladiatorPrices && gladiatorVolumes && totalVolumeFormatted && parseFloat(amount) ? 
                    (() => {
                      const volume = formatEther(gladiatorVolumes[Number(selectedGladiator.index)]);
                      const impliedProbability = totalVolumeFormatted !== '0'
                        ? (Number(volume) / Number(totalVolumeFormatted))
                        : Number(gladiatorPrices[Number(selectedGladiator.index)]) / Number(BASIS_POINTS);
                      const avgPrice = orderType === 'sell' ? impliedProbability : (1 - impliedProbability);
                      return (parseFloat(amount) / avgPrice).toFixed(2);
                    })()
                    : '0.00'}</span>
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
                  !selectedGladiator || 
                  parseFloat(amount) <= 0 || 
                  isApprovePending || 
                  isApproveConfirming || 
                  isOrderPending || 
                  isOrderConfirming
                }
                onClick={() => selectedGladiator && handlePlaceLimitOrder(selectedGladiator.index, orderType === 'buy')}
              >
                {!isConnected 
                  ? 'Connect Wallet' 
                  : !selectedGladiator 
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
