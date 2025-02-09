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

import { useState, useEffect, useMemo } from "react";

import { waitForTransactionReceipt } from "viem/actions";

import BondingCurveComp from "./debate-details/BondingCurve";
import DebateInfo from "./debate-details/DebateInfo";
import { DebateDiscussion } from "./debate-details/DebateDiscussion";

import GladiatorListComp from "./debate-details/GladiatorList";
import NominationCard from "./debate-details/NominationCard";
import DesktopSideDrawer from "./debate-details/DesktopSideDrawer";
import MobileSideDrawer from "./debate-details/MobileSideDrawer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Toaster, toast } from "sonner";

interface Message {
  sender: string;
  content: string;
  timestamp: string;
}

// Type for how bonding curve is returned from contract
type BondingCurve = [
  bigint, // target
  bigint, // current
  bigint, // basePrice
  bigint, // currentPrice
  boolean, // isFulfilled
  bigint, // endTime
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
  bigint, // totalBondingAmount
];

type RoundInfo = [
  bigint, // roundIndex
  bigint, // startTime
  bigint, // endTime
  boolean, // isComplete
];

type LeaderboardInfo = [
  bigint[], // totalScores
  bigint[], // gladiatorIndexes
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
  finalOutcome: bigint, // finalOutcome
];

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

  const {
    isLoading: isOrderConfirming,
    isSuccess: isOrderConfirmed,
    error: errorTxnOrder,
  } = useWaitForTransactionReceipt({
    hash: orderHash,
  });

  // Effect for handling order confirmation
  useEffect(() => {
    if (isOrderConfirmed) {
      console.log("Order confirmed, refreshing data...");
      toast.success("Order confirmed!");
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
  const [debateEndTime] = debateDetails || [];

  // Loading check for market data
  const isMarketDataLoading =
    !marketDetails ||
    !gladiators ||
    !gladiatorPrices ||
    !bondingCurveDetails ||
    !debateDetails;

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
  const { data: allGladiators, refetch: refetchAllGladiators } =
    useReadContract({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      functionName: "getAllGladiators",
    }) as { data: Gladiator[] | undefined; refetch: () => void };

  // Add contract write for nomination
  const {
    data: nominateHash,
    isPending: isNominatePending,
    writeContract: nominateGladiator,
  } = useWriteContract();

  const {
    isLoading: isNominateConfirming,
    isSuccess: isNominateConfirmed,
    error: nominateTxError,
  } = useWaitForTransactionReceipt({
    hash: nominateHash,
  });

  useEffect(() => {
    if (isNominateConfirmed) {
      console.log("Nomination confirmed");
      toast.success("Nomination for your gladiator is confirmed!");
    }
  }, [isNominateConfirmed]);

  useEffect(() => {
    if (nominateTxError) {
      console.log("Error in Nomination ");
      toast.error("Error in Nomination for your gladiator!");
    }
  }, [nominateTxError]);

  useEffect(() => {
    if (errorTxnOrder) {
      console.log("Error in placing order");
      toast.error("Some error occurred while placing order");
    }
  }, [errorTxnOrder]);

  // Add hook for checking ownership
  const { data: ownershipData } = useReadContract({
    address: GLADIATOR_NFT_ADDRESS,
    abi: GLADIATOR_NFT_ABI,
    functionName: "ownerOf",
    args: selectedGladiator?.tokenId
      ? [BigInt(selectedGladiator.tokenId)]
      : undefined,
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
                    name: gladiator.name || `Gladiator #${tokenId}`,
                  } as Gladiator;
                }
              } catch (error) {
                console.error(
                  `Error checking ownership for gladiator ${index + 1}:`,
                  error
                );
              }
              return null;
            })
          );

          const validGladiators = userOwnedGladiators.filter(
            (g): g is Gladiator =>
              g !== null &&
              typeof g === "object" &&
              "tokenId" in g &&
              typeof g.tokenId === "number"
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
    return (
      gladiators?.map((g, index) => ({ ...g, index: BigInt(index) })) || []
    );
  }, [gladiators]);

  // TODO: replace it with isActive when recieved correct from contract
  const daysRemaining = Math.floor(timeRemaining / (24 * 60 * 60));
  const hoursRemaining = Math.floor((timeRemaining % (24 * 60 * 60)) / 3600);

  let isDummyActive = true;
  if (daysRemaining === 0 && hoursRemaining === 0) {
    isDummyActive = false;
  }

  return (
    <>
      <div className="ml-6 pixelated-2 relative mt-10">
        <div className="flex-grow space-y-4 w-[60%] width-set p-5">
          <Toaster
            position="bottom-right"
            expand={false}
            richColors
            closeButton
          />
          {/* Debate Info Section */}
          <DebateInfo
            expandedCards={expandedCards}
            debateDetails={debateDetails}
            totalVolume={totalVolume}
            timeRemaining={timeRemaining}
          />

          {/* AI Discussion */}
          <DebateDiscussion
            bondingCurve={bondingCurve}
            expandedCards={expandedCards}
            toggleCard={toggleCard}
            chatMessages={chatMessages}
          />

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
              <BondingCurveComp
                bondingCurve={bondingCurve}
                expandedCards={expandedCards}
              />

              {/* Gladiator List */}
              <GladiatorListComp
                expandedCards={expandedCards}
                setIsNominationModalOpen={setIsNominationModalOpen}
                isConnected={isConnected}
                indexedGladiators={indexedGladiators}
                gladiatorPrices={gladiatorPrices}
                gladiatorVolumes={gladiatorVolumes}
                totalVolume={totalVolume}
                setSelectedGladiator={setSelectedGladiator}
                setOrderType={setOrderType}
                setAmount={setAmount}
                handleAmountChange={handleAmountChange}
              />
            </>
          )}
        </div>

        <div className="md:fixed md:left-[65%] md:top-6 md:w-80 md:h-[calc(100vh-3rem)]">
          {/* Desktop Sidebar - Visible on large screens */}
          <DesktopSideDrawer
            selectedGladiator={selectedGladiator}
            setSelectedGladiator={setSelectedGladiator}
            setOrderType={setOrderType}
            indexedGladiators={indexedGladiators}
            handleAmountChange={handleAmountChange}
            amount={amount}
            adjustAmount={adjustAmount}
            gladiatorPrices={gladiatorPrices}
            gladiatorVolumes={gladiatorVolumes}
            totalVolume={totalVolume}
            orderType={orderType}
            potentialReturn={potentialReturn}
            isConnected={isConnected}
            isApproveConfirming={isApproveConfirming}
            isApprovePending={isApprovePending}
            isOrderPending={isOrderPending}
            isOrderConfirming={isOrderConfirming}
            handlePlaceLimitOrder={handlePlaceLimitOrder}
            isActive={isDummyActive}
          />

          <MobileSideDrawer
            selectedGladiator={selectedGladiator}
            setSelectedGladiator={setSelectedGladiator}
            setOrderType={setOrderType}
            indexedGladiators={indexedGladiators}
            handleAmountChange={handleAmountChange}
            amount={amount}
            adjustAmount={adjustAmount}
            gladiatorPrices={gladiatorPrices}
            gladiatorVolumes={gladiatorVolumes}
            totalVolume={totalVolume}
            orderType={orderType}
            potentialReturn={potentialReturn}
            isConnected={isConnected}
            isApproveConfirming={isApproveConfirming}
            isApprovePending={isApprovePending}
            isOrderPending={isOrderPending}
            isOrderConfirming={isOrderConfirming}
            handlePlaceLimitOrder={handlePlaceLimitOrder}
            isActive={isDummyActive}
          />

          {/* Mobile/Tablet Drawer - Visible on smaller screens */}
        </div>

        {/* Nomination Card */}
        <NominationCard
          bondingCurve={bondingCurve}
          marketId={marketId}
          isOrderConfirming={isOrderConfirming}
          isOrderPending={isOrderPending}
          isApproveConfirming={isApproveConfirming}
          isApprovePending={isApprovePending}
          isNominationModalOpen={isNominationModalOpen}
          setIsNominationModalOpen={setIsNominationModalOpen}
          userGladiators={userGladiators}
          handleNominate={handleNominate}
          isActive={isDummyActive}
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
          <DialogContent className="bg-[#52362B] border-2 border-[#52362B]">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CCAA00]"></div>
              <p className="text-lg font-semibold text-[#CCAA00]">
                Transaction Being Processed
              </p>
              <p className="text-sm text-[#D1BB9E]">
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
      </div>
    </>
  );
}
