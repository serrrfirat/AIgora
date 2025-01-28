import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DEBATE_FACTORY_ADDRESS,
  DEBATE_FACTORY_ABI,
  MARKET_FACTORY_ADDRESS,
  MARKET_FACTORY_ABI,
  GLADIATOR_NFT_ABI,
  GLADIATOR_NFT_ADDRESS,
} from "@/config/contracts";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { formatEther, formatAddress } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { waitForTransactionReceipt } from "viem/actions";
import { config } from "@/config/wallet-config";
import { ChevronDown, Menu } from "lucide-react";
import { BribeSubmission } from "./BribeSubmission";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  Users,
  Calendar,
  BarChart3,
  Trophy,
  Activity,
  AlertCircle,
} from "lucide-react";
import Navbar from "./Navbar";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { NominateGladiatorCard } from "./NominateGladiatorCard";

interface Message {
  sender: string;
  content: string;
  timestamp: string;
}

// Constants from the contract
const BASIS_POINTS = 10000n;
const MIN_PRICE = 1n; // $0.01 in basis points
const MAX_PRICE = 9900n; // $0.99 in basis points
const MIN_ORDER_SIZE = BigInt(10 ** 18); // 1 full token

// Type definitions matching MarketFactory.sol structs
type BondingCurveStruct = {
  target: bigint; // Target amount to reach
  current: bigint; // Current amount raised
  basePrice: bigint; // Starting price
  currentPrice: bigint; // Current price
  isFulfilled: boolean; // Whether target is reached
  endTime: bigint; // When bonding period ends
};

// Type for how bonding curve is returned from contract
type BondingCurve = [
  bigint, // target
  bigint, // current
  bigint, // basePrice
  bigint, // currentPrice
  boolean, // isFulfilled
  bigint // endTime
];

type Gladiator = {
  aiAddress: string; // Address of the AI agent
  name: string; // Name of the gladiator
  index: bigint; // Index in gladiators array
  isActive: boolean; // Whether still in competition
  publicKey: string; // Public key for encrypted bribes
  tokenId: number; // Token ID of the NFT - making this required instead of optional
};

type JudgeVerdict = {
  scores: bigint[]; // Scores for each gladiator
  timestamp: bigint; // When verdict was given
};

type Round = {
  startTime: bigint;
  endTime: bigint;
  isComplete: boolean;
  verdict: JudgeVerdict;
};

type Order = {
  price: bigint; // Price in basis points (100 = 1%)
  amount: bigint; // Amount of shares
  outcomeIndex: bigint; // Which outcome this order is for
  owner: string; // Order creator
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
  string, // token
  bigint, // debateId
  boolean, // resolved
  bigint, // winningGladiator
  BondingCurve, // bondingCurve
  bigint // totalBondingAmount
];

type RoundInfo = [
  bigint, // roundIndex
  bigint, // startTime
  bigint, // endTime
  boolean // isComplete
];

type LeaderboardInfo = [
  bigint[], // totalScores
  bigint[] // gladiatorIndexes
];

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
  finalOutcome: bigint // finalOutcome
];

// Type for arrays that will be indexed
type GladiatorPrices = { [index: string]: bigint };
type GladiatorVolumes = { [index: string]: bigint };
type UserPositions = { [index: string]: bigint };

interface DebateViewProps {
  debateId: number;
}

export function DebateView2({ debateId }: DebateViewProps) {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();

  // Component state
  const [pendingTx, setPendingTx] = useState(false);
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [selectedGladiator, setSelectedGladiator] = useState<Gladiator | null>(
    null
  );
  const [amount, setAmount] = useState<string>("0");
  const [potentialReturn, setPotentialReturn] = useState<string>("0.00");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  // Transaction state
  const {
    data: approveHash,
    isPending: isApprovePending,
    writeContract: approveToken,
  } = useWriteContract();

  const {
    data: orderHash,
    isPending: isOrderPending,
    writeContract: placeLimitOrder,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  const { isLoading: isOrderConfirming, isSuccess: isOrderConfirmed } =
    useWaitForTransactionReceipt({
      hash: orderHash,
    });

  // Effect for handling order confirmation
  useEffect(() => {
    if (isOrderConfirmed) {
      console.log("Order confirmed, refreshing data...");
      // Reset form
      setAmount("0");
      setPotentialReturn("0.00");
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
    leaderboard: true,
  });

  const toggleCard = (cardName: keyof typeof expandedCards) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardName]: !prev[cardName],
    }));
  };

  /// Get Debate Details
  const { data: debateDetails, refetch: refetchDebateDetails } =
    useReadContract({
      address: DEBATE_FACTORY_ADDRESS,
      abi: DEBATE_FACTORY_ABI,
      functionName: "getDebateDetails",
      args: [BigInt(debateId)],
    }) as { data: DebateDetails | undefined; refetch: () => void };

  // Get market ID from debate ID
  const { data: marketId, refetch: refetchMarketId } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: "debateIdToMarketId",
    args: [BigInt(debateId)],
  });

  // Log market ID changes
  useEffect(() => {
    console.log("[DebateView] marketId changed:", marketId?.toString());
  }, [marketId]);

  // Get market details
  const { data: marketDetails, refetch: refetchMarketDetails } =
    useReadContract({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      functionName: "getMarketDetails",
      args: marketId ? [marketId] : undefined,
    }) as { data: MarketDetails | undefined; refetch: () => void };

  // Get gladiators
  const { data: gladiators, refetch: refetchGladiators } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: "getGladiators",
    args: marketId ? [marketId] : undefined,
  }) as { data: Gladiator[] | undefined; refetch: () => void };

  // Get round info
  const { data: roundInfo, refetch: refetchRoundInfo } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: "getCurrentRound",
    args: marketId ? [marketId] : undefined,
  }) as { data: RoundInfo | undefined; refetch: () => void };

  // Get leaderboard
  const { data: leaderboard, refetch: refetchLeaderboard } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: "getLeaderboard",
    args: marketId ? [marketId] : undefined,
  }) as { data: LeaderboardInfo | undefined; refetch: () => void };

  // Get market prices
  const { data: gladiatorPrices, refetch: refetchPrices } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: "getMarketPrices",
    args: marketId ? [marketId] : undefined,
  }) as { data: bigint[] | undefined; refetch: () => void };

  // Get market volumes
  const { data: gladiatorVolumes, refetch: refetchVolumes } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: "getMarketVolumes",
    args: marketId ? [marketId] : undefined,
  }) as { data: bigint[] | undefined; refetch: () => void };

  // Get total volume
  const { data: totalVolume, refetch: refetchTotalVolume } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: "getTotalVolume",
    args: marketId ? [marketId] : undefined,
  }) as { data: bigint | undefined; refetch: () => void };

  // Get bonding curve details
  const { data: bondingCurveDetails, refetch: refetchBondingCurve } =
    useReadContract({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      functionName: "getBondingCurveDetails",
      args: marketId ? [marketId] : undefined,
    }) as { data: BondingCurve | undefined; refetch: () => void };

  // Get user positions if connected
  const { data: userPositions } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: "getUserPositions",
    args: marketId && address ? [marketId, address] : undefined,
  }) as { data: bigint[] | undefined };

  // Add allowance check
  const { data: currentAllowance } = useReadContract({
    address: marketDetails?.[0] as `0x${string}`,
    abi: [
      {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "allowance",
    args:
      address && marketDetails ? [address, MARKET_FACTORY_ADDRESS] : undefined,
  });

  // Add state for chat messages

  // Effect to fetch and subscribe to chat messages
  useEffect(() => {
    console.log(
      "[DebateView] Chat effect triggered with marketId:",
      marketId?.toString()
    );
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
        console.log(
          "[DebateView] Fetching messages for market:",
          marketIdBigInt.toString()
        );
        const response = await fetch(`/api/chat/${marketIdBigInt}`, {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
            // Add a timestamp to force unique requests
            "X-Request-Time": Date.now().toString(),
          },
          // Disable caching at fetch level
          cache: "no-store",
          next: { revalidate: 0 },
        });
        if (!response.ok) {
          console.error(
            "[DebateView] HTTP error from API:",
            response.status,
            response.statusText
          );
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const messages = await response.json();
        if ("error" in messages) {
          console.error("[DebateView] API returned error:", messages.error);
          return;
        }
        console.log("[DebateView] Received messages:", messages);
        setChatMessages(messages);
      } catch (error) {
        console.error("[DebateView] Error fetching chat messages:", error);
      }
    };

    // Set up WebSocket connection
    const setupWebSocket = () => {
      if (!process.env.NEXT_PUBLIC_WS_URL) {
        console.error("[DebateView] NEXT_PUBLIC_WS_URL not set");
        return;
      }

      console.log(
        "[DebateView] Setting up WebSocket for market:",
        marketIdBigInt.toString()
      );
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
          setChatMessages((prev) => [...prev, message]);
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
      refetchDebateDetails(),
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
    finalOutcome,
  ] = debateDetails || [];

  // Loading check for market data
  const isMarketDataLoading =
    !marketDetails ||
    !gladiators ||
    !gladiatorPrices ||
    !bondingCurveDetails ||
    !debateDetails;

  // Format total volume
  const totalVolumeFormatted = formatEther(totalVolume || 0n);

  // Calculate end date
  const endDate = debateEndTime
    ? new Date(Number(debateEndTime) * 1000)
    : new Date();

  // Format bonding curve data
  const bondingCurve = bondingCurveDetails
    ? {
        target: bondingCurveDetails[0],
        current: bondingCurveDetails[1],
        basePrice: bondingCurveDetails[2],
        currentPrice: bondingCurveDetails[3],
        isFulfilled: bondingCurveDetails[4],
        endTime: bondingCurveDetails[5],
      }
    : null;

  // Extract round info
  const [roundIndex, roundStartTime, roundEndTime, isRoundComplete] =
    roundInfo || [0n, 0n, 0n, false];

  // Calculate time remaining
  const timeRemaining = bondingCurve
    ? Math.max(0, Number(bondingCurve.endTime) - Math.floor(Date.now() / 1000))
    : 0;
  const daysRemaining = Math.floor(timeRemaining / (24 * 60 * 60));
  const hoursRemaining = Math.floor((timeRemaining % (24 * 60 * 60)) / 3600);

  const handleApproveToken = async (amountInWei: bigint) => {
    if (!marketDetails || !address) return false;

    try {
      // Check if we already have sufficient allowance
      if (currentAllowance && currentAllowance >= amountInWei) {
        console.log("Already approved sufficient amount");
        return true;
      }

      // If not, proceed with approval
      approveToken({
        address: marketDetails[0] as `0x${string}`,
        abi: [
          {
            name: "approve",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ type: "bool" }],
          },
        ],
        functionName: "approve",
        args: [MARKET_FACTORY_ADDRESS, amountInWei],
      });

      // Wait for approval hash
      while (!approveHash) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Wait for approval confirmation
      if (approveHash && publicClient) {
        await waitForTransactionReceipt(publicClient as any, {
          hash: approveHash,
        });
        return true;
      }
    } catch (error) {
      console.error("Error in approval:", error);
      return false;
    }
    return false;
  };
  console.log("Bonding curve", bondingCurve);
  const handlePlaceLimitOrder = async (
    outcomeIndex: bigint,
    isLong: boolean
  ) => {
    if (!marketId || !bondingCurve) {
      console.error("Market data not loaded");
      return;
    }

    try {
      setPendingTx(true);
      console.log("Creating order for", amount, "of", isLong ? "Yes" : "No");
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 10 ** 18));

      // First approve
      const approved = await handleApproveToken(amountInWei);
      if (!approved) {
        console.error("Approval failed");
        setPendingTx(false);
        return;
      }

      // Then place order
      const price = isLong
        ? bondingCurve.basePrice
        : 10000n - bondingCurve.basePrice;
      if (!marketId) {
        console.error("Market ID is required");
        return;
      }
      // Ensure marketId is properly converted to bigint
      const marketIdBigInt = BigInt(marketId as string);

      // Safe logging with null checks
      console.log("Placing order with params:", {
        marketId: marketIdBigInt,
        outcomeIndex: outcomeIndex,
        price: price,
        amountInWei: amountInWei,
      });

      await placeLimitOrder({
        address: MARKET_FACTORY_ADDRESS as `0x${string}`,
        abi: MARKET_FACTORY_ABI,
        functionName: "placeLimitOrder",
        args: [marketIdBigInt, outcomeIndex, price, amountInWei],
      });
    } catch (error) {
      console.error("Error placing order:", error);
    } finally {
      setPendingTx(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setAmount(value);
    // Calculate potential return based on current price
    if (selectedGladiator && gladiatorPrices) {
      const price =
        Number(gladiatorPrices[Number(selectedGladiator.index)]) / 100;
      const return_value =
        orderType === "buy"
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

  // Add new state for nomination modal
  const [isNominationModalOpen, setIsNominationModalOpen] = useState(false);

  // Add state for user's gladiators
  const [userGladiators, setUserGladiators] = useState<Gladiator[]>([]);

  // Get all gladiators
  const { data: allGladiators, refetch: refetchAllGladiators } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: "getAllGladiators",
  }) as { data: Gladiator[] | undefined; refetch: () => void };

  // Add contract write for nomination
  const {
    data: nominateHash,
    isPending: isNominatePending,
    writeContract: nominateGladiator
  } = useWriteContract();

  // Add hook for checking ownership
  const { data: ownershipData } = useReadContract({
    address: GLADIATOR_NFT_ADDRESS,
    abi: GLADIATOR_NFT_ABI,
    functionName: "ownerOf",
    args: selectedGladiator?.tokenId ? [BigInt(selectedGladiator.tokenId)] : undefined,
  });

  // Effect to filter user's gladiators
  useEffect(() => {
    if (allGladiators && address && publicClient) {
      const fetchUserGladiators = async () => {
        try {
          const userOwnedGladiators = await Promise.all(
            allGladiators.map(async (gladiator, index) => {
              try {
                if (!gladiator) return null;
                
                // Use multicall to batch ownership checks
                const ownerData = await publicClient.readContract({
                  address: GLADIATOR_NFT_ADDRESS,
                  abi: GLADIATOR_NFT_ABI,
                  functionName: "ownerOf",
                  args: [BigInt(index + 1)], // tokenIds start from 1
                });
                
                const owner = ownerData as string;
                
                if (owner && owner.toLowerCase() === address.toLowerCase()) {
                  const tokenId = index + 1;
                  return {
                    ...gladiator,
                    tokenId,
                    name: gladiator.name || `Gladiator #${tokenId}`
                  } as Gladiator;
                }
              } catch (error) {
                console.error(`Error checking ownership for gladiator ${index + 1}:`, error);
              }
              return null;
            })
          );
          
          const validGladiators = userOwnedGladiators.filter((g): g is Gladiator => 
            g !== null && 
            typeof g === 'object' && 
            'tokenId' in g && 
            typeof g.tokenId === 'number'
          );
          
          setUserGladiators(validGladiators);
        } catch (error) {
          console.error("Error fetching user gladiators:", error);
          setUserGladiators([]);
        }
      };
      
      fetchUserGladiators();
    } else {
      setUserGladiators([]);
    }
  }, [allGladiators, address, publicClient]);

  const handleNominate = async (tokenId: number | undefined) => {
    if (!marketId || !tokenId) return;
    
    try {
      await nominateGladiator({
        address: MARKET_FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: "nominateGladiator",
        args: [BigInt(tokenId), marketId],
      });
      setIsNominationModalOpen(false);
    } catch (error) {
      console.error("Error nominating gladiator:", error);
    }
  };

  // Add index mapping
  const indexedGladiators = useMemo(() => {
    return gladiators?.map((g, index) => ({ ...g, index: BigInt(index) })) || [];
  }, [gladiators]);

  return (
    <>
      {/* <Navbar /> */}

      <div className=" ml-6 pixelated-2 relative">
        {/* Main content */}

        <div className="flex-grow space-y-4 lg:w-[700px] p-5   ">
          {/* Debate Info Section */}
          {/* Debate Info Section */}
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
                isActive
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-300 border border-rose-500/30"
              }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isActive
                              ? "bg-emerald-300 animate-pulse"
                              : "bg-rose-300"
                          }`}
                        />
                        <span>{isActive ? "Active" : "Ended"}</span>
                      </div>

                      {isActive && (
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

          {/* AI Discussion */}
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
                        Once the bonding curve target is reached, three expert
                        AI agents will begin analyzing and debating this topic
                        in real-time.
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

          {/* Rest of the components */}
          {isMarketDataLoading ? (
            <div>Loading market details...</div>
          ) : (
            <>
              {/* Bribe Submission */}
              {/* {bondingCurve?.isFulfilled && marketId && (
                <BribeSubmission
                  marketId={BigInt(marketId.toString())}
                  roundId={roundIndex}
                  gladiators={gladiators}
                  onBribeSubmitted={refetchAllData}
                />
              )} */}

              {/* Bonding Curve Progress */}
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

              {/* Gladiator List */}
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
                          const totalVolumeFormatted = formatEther(
                            totalVolume || 0n
                          );
                          const volumePercentage =
                            totalVolumeFormatted !== "0"
                              ? (
                                  (Number(volume) /
                                    Number(totalVolumeFormatted)) *
                                  100
                                ).toFixed(1)
                            : currentPrice.toFixed(1);

                          const impliedProbability =
                            totalVolumeFormatted !== "0"
                              ? (
                                  (Number(volume) /
                                    Number(totalVolumeFormatted)) *
                                  100
                                ).toFixed(1)
                            : currentPrice.toFixed(1);

                          const yesPrice = (
                            Number(impliedProbability) / 100
                          ).toFixed(2);
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
            </>
          )}
        </div>
        <div className="md:fixed md:left-[65%] md:top-6 md:w-80 md:h-[calc(100vh-3rem)]">
          {/* Desktop Sidebar - Visible on large screens */}
          <div className="hidden md:block h-full">
            <Card className="bg-[#52362B] absolute h-[450px] w-[350px] border-4 border-[#52362B] top-[100px]">
              <ScrollArea
                className="h-full "
                style={{ scrollbarWidth: "none" }}
              >
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
                                  gladiatorVolumes[
                                    Number(selectedGladiator.index)
                                  ]
                                );
                                const impliedProbability =
                                  totalVolumeFormatted !== "0"
                                    ? Number(volume) /
                                      Number(totalVolumeFormatted)
                                    : Number(
                                        gladiatorPrices[
                                          Number(selectedGladiator.index)
                                        ]
                                      ) / Number(BASIS_POINTS);
                                return orderType === "sell"
                                  ? `${impliedProbability.toFixed(2)}¢`
                                  : `${(1 - impliedProbability).toFixed(2)}¢`;
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
                                  gladiatorVolumes[
                                    Number(selectedGladiator.index)
                                  ]
                                );
                                const impliedProbability =
                                  totalVolumeFormatted !== "0"
                                    ? Number(volume) /
                                      Number(totalVolumeFormatted)
                                    : Number(
                                        gladiatorPrices[
                                          Number(selectedGladiator.index)
                                        ]
                                      ) / Number(BASIS_POINTS);
                                const avgPrice =
                                  orderType === "sell"
                                    ? impliedProbability
                                    : 1 - impliedProbability;
                                return (parseFloat(amount) / avgPrice).toFixed(
                                  2
                                );
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
                        parseFloat(amount) <= 0
                          ? "bg-[#f0efef] text-[#3D3D3D]"
                          : "bg-[#D1BB9E] hover:bg-[#D1BB9E]/90"
                      }`}
                      disabled={
                        !isConnected ||
                        !selectedGladiator ||
                        parseFloat(amount) <= 0 ||
                        isApprovePending ||
                        isApproveConfirming ||
                        isOrderPending ||
                        isOrderConfirming
                      }
                      onClick={() => {
                        console.log("selectedGladiator with index", selectedGladiator?.index);
                        if (typeof selectedGladiator?.index === 'undefined') {
                          console.error("No gladiator selected or invalid index");
                          return;
                        }
                        handlePlaceLimitOrder(
                          selectedGladiator.index,  // This is the outcomeIndex
                          orderType === "buy"
                        );
                      }}
                    >
                      {!isConnected
                        ? "Connect Wallet"
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

          {/* Mobile/Tablet Drawer - Visible on smaller screens */}
          <div className="fixed md:bottom-6 right-6 z-50">
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full bg-[#D1BB9E] hover:bg-[#D1BB9E]/90 shadow-lg text-[#3D3D3D]"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="bg-[#52362B] border-t-4 border-[#52362B]">
                <div className="max-h-[80vh] overflow-auto">
                  <ScrollArea className="h-[calc(80vh-2rem)] mx-auto max-w-lg px-4 py-6">
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        {/* Order Type Tabs */}
                        <Tabs
                          defaultValue="buy"
                          onValueChange={(v) =>
                            setOrderType(v as "buy" | "sell")
                          }
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
                              onChange={(e) =>
                                handleAmountChange(e.target.value)
                              }
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
                                      gladiatorVolumes[
                                        Number(selectedGladiator.index)
                                      ]
                                    );
                                    const impliedProbability =
                                      totalVolumeFormatted !== "0"
                                        ? Number(volume) /
                                          Number(totalVolumeFormatted)
                                        : Number(
                                            gladiatorPrices[
                                              Number(selectedGladiator.index)
                                            ]
                                          ) / Number(BASIS_POINTS);
                                    return orderType === "sell"
                                      ? `${impliedProbability.toFixed(2)}¢`
                                      : `${(1 - impliedProbability).toFixed(
                                          2
                                        )}¢`;
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
                                      gladiatorVolumes[
                                        Number(selectedGladiator.index)
                                      ]
                                    );
                                    const impliedProbability =
                                      totalVolumeFormatted !== "0"
                                        ? Number(volume) /
                                          Number(totalVolumeFormatted)
                                        : Number(
                                            gladiatorPrices[
                                              Number(selectedGladiator.index)
                                            ]
                                          ) / Number(BASIS_POINTS);
                                    const avgPrice =
                                      orderType === "sell"
                                        ? impliedProbability
                                        : 1 - impliedProbability;
                                    return (
                                      parseFloat(amount) / avgPrice
                                    ).toFixed(2);
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
                            parseFloat(amount) <= 0
                              ? "bg-[#f0efef] text-[#3D3D3D]"
                              : "bg-[#D1BB9E] hover:bg-[#D1BB9E]/90"
                          }`}
                          disabled={
                            !isConnected ||
                            !selectedGladiator ||
                            parseFloat(amount) <= 0 ||
                            isApprovePending ||
                            isApproveConfirming ||
                            isOrderPending ||
                            isOrderConfirming
                          }
                          onClick={() => {
                          console.log("selectedGladiator with index", selectedGladiator);
                            if (typeof selectedGladiator?.index === 'undefined') {
                              console.error("No gladiator selected or invalid index");
                              return;
                            }
                            handlePlaceLimitOrder(
                              selectedGladiator.index,  // This is the outcomeIndex
                              orderType === "buy"
                            );
                          }}
                        >
                          {!isConnected
                            ? "Connect Wallet"
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
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        {/* Nomination Card */}
        <NominateGladiatorCard
          marketId={marketId as bigint}
          isBondingCurveFulfilled={bondingCurve?.isFulfilled ?? false}
        />

        {/* Add the confirmation dialog */}
        <Dialog
          open={
            isApprovePending ||
            isApproveConfirming ||
            isOrderPending ||
            isOrderConfirming
          }
          onOpenChange={() => {}}
        >
          <DialogContent className="sm:max-w-[425px]">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="text-lg font-semibold">
                Transaction Being Processed
              </p>
              <p className="text-sm text-gray-500">
                {isApprovePending
                  ? "Preparing approval..."
                  : isApproveConfirming
                  ? "Confirming approval..."
                  : isOrderPending
                  ? "Preparing order..."
                  : isOrderConfirming
                  ? "Confirming order..."
                  : "Processing..."}
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Nomination Modal */}
        <Dialog open={isNominationModalOpen} onOpenChange={setIsNominationModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-[#52362B] border-[#D1BB9E]/20">
            <div className="p-6">
              <h2 className="text-2xl font-medium text-[#FFD700] mb-6">Select a Gladiator to Nominate</h2>
              
              {userGladiators.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#E6D5C3]">You don&apos;t own any Gladiator NFTs yet.</p>
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
                  {userGladiators.filter(Boolean).map((gladiator) => (
                    gladiator && (
                      <div
                        key={gladiator.tokenId}
                        className="bg-[#2A1B15] border border-[#D1BB9E]/20 rounded-lg p-4 cursor-pointer hover:border-[#FFD700]/50 transition-all"
                        onClick={() => handleNominate(gladiator.tokenId)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#CCAA00]/20 border border-[#FFD700]/30 flex items-center justify-center">
                            <span className="text-2xl">🤖</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-[#E6D5C3]">{gladiator.name || 'Unnamed Gladiator'}</h3>
                            <p className="text-sm text-[#D1BB9E]/60">Token #{gladiator.tokenId || 'Unknown'}</p>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

