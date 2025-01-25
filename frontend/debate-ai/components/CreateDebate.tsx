import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useChainId,
} from "wagmi";
import {
  DEBATE_FACTORY_ADDRESS,
  DEBATE_FACTORY_ABI,
  MARKET_FACTORY_ADDRESS,
  MARKET_FACTORY_ABI,
  MOCK_TOKEN_ADDRESS,
} from "@/config/contracts";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Label } from "./ui/label";
import { Dialog, DialogContent } from "./ui/dialog";
import { decodeEventLog, Log } from "viem";
import { Sword, Clock, Users, MessageSquare } from "lucide-react";
import Image from "next/image";

const GLADIATOR_NAMES = [
  "Socrates",
  "Plato",
  "Aristotle",
  "Marcus Aurelius",
  "Seneca",
];

const GLADIATOR_ADDRESSES = [
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
  "0x4444444444444444444444444444444444444444",
  "0x5555555555555555555555555555555555555555",
] as const;

const GLADIATOR_PUBLIC_KEYS = [
  "0x0001",
  "0x0002",
  "0x0003",
  "0x0004",
  "0x0005",
] as const;

const DEFAULT_BONDING_TARGET = BigInt(1000) * BigInt(10 ** 18);
const DEFAULT_BONDING_DURATION = 7 * 24 * 60 * 60;
const DEFAULT_BASE_PRICE = 100;

export function CreateDebate() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("1");
  const [rounds, setRounds] = useState("3");
  const [judgeAI, setJudgeAI] = useState("");

  const {
    data: debateHash,
    writeContract: writeDebate,
    error: writeError,
    isPending: isDebatePending,
  } = useWriteContract();

  const {
    data: marketHash,
    writeContract: writeMarket,
    error: marketError,
    isPending: isMarketPending,
  } = useWriteContract();

  const {
    isLoading: isConfirmingDebate,
    isSuccess: isDebateSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: debateHash,
  });

  const { isLoading: isConfirmingMarket } = useWaitForTransactionReceipt({
    hash: marketHash,
  });

  useEffect(() => {
    if (writeError) {
      console.error("Debate creation error:", writeError);
    }
    if (marketError) {
      console.error("Market creation error:", marketError);
    }
  }, [writeError, marketError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    writeDebate({
      address: DEBATE_FACTORY_ADDRESS,
      abi: DEBATE_FACTORY_ABI,
      functionName: "createDebate",
      args: [
        topic,
        BigInt(Number(duration) * 24 * 60 * 60),
        BigInt(rounds),
        [judgeAI],
      ],
    });
  };

  useEffect(() => {
    if (isDebateSuccess && receipt?.logs && writeMarket) {
      try {
        const log = receipt.logs.find((log: Log) => {
          try {
            const event = decodeEventLog({
              abi: DEBATE_FACTORY_ABI,
              ...log,
            });
            return event.eventName === "DebateCreated";
          } catch (error) {
            return false;
          }
        });

        if (!log) return;

        const decodedEvent = decodeEventLog({
          abi: DEBATE_FACTORY_ABI,
          ...log,
        });

        if (
          decodedEvent.eventName === "DebateCreated" &&
          decodedEvent.args &&
          "debateId" in decodedEvent.args
        ) {
          writeMarket({
            address: MARKET_FACTORY_ADDRESS,
            abi: MARKET_FACTORY_ABI,
            functionName: "createMarket",
            args: [
              MOCK_TOKEN_ADDRESS as `0x${string}`,
              decodedEvent.args.debateId,
              judgeAI as `0x${string}`,
              DEFAULT_BONDING_TARGET,
              DEFAULT_BONDING_DURATION,
              DEFAULT_BASE_PRICE,
            ] as const,
          });
        }
      } catch (error) {
        console.error("Error creating market:", error);
      }
    }
  }, [isDebateSuccess, receipt, writeMarket, judgeAI]);

  const isPending =
    isDebatePending ||
    isMarketPending ||
    isConfirmingDebate ||
    isConfirmingMarket;

  return (
    <div className="w-full max-w-md mx-auto relative">
      <Card className="bg-transparent border-2 border-[#9c9c9c] shadow-xl backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <div>
            <div className="text-2xl text-center text-[#b0222b] pixelated text-wrap mt-5">
              CREATE DEBATE
            </div>
            <div className=" text-center pixelated-2 text-lg text-gray-800 text-wrap">
              Initiate a new battle of minds in the arena
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="topic" className="text-[#3D3D3D]">
                <div className="flex text-lg font-bold items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Topic
                </div>
              </Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter debate topic"
                required
                className="bg-[#483535] border-[#D1BB9E]/20 text-[#f0ecec] placeholder:text-[#D1BB9E]/50 focus:border-[#cfcece] "
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="duration" className="text-[#3D3D3D]">
                <div className="flex text-lg font-bold items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Duration (days)
                </div>
              </Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                required
                className="bg-[#483535] border-[#D1BB9E]/20 text-[#f0ecec] placeholder:text-[#D1BB9E]/50 focus:border-[#cfcece] "
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rounds" className="text-[#3D3D3D]">
                <div className="flex text-lg font-bold items-center gap-2">
                  <Users className="w-5 h-5" />
                  Number of Rounds
                </div>
              </Label>
              <Input
                id="rounds"
                type="number"
                value={rounds}
                onChange={(e) => setRounds(e.target.value)}
                min="1"
                required
                className="bg-[#483535] border-[#D1BB9E]/20 text-[#f0ecec] placeholder:text-[#D1BB9E]/50 focus:border-[#cfcece] "
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="judgeAI"
                className="text-[#3D3D3D] text-lg font-bold"
              >
                Judge AI Address
              </Label>
              <Input
                id="judgeAI"
                value={judgeAI}
                onChange={(e) => setJudgeAI(e.target.value)}
                placeholder="Enter Judge AI address"
                required
                className="bg-[#483535] border-[#D1BB9E]/20 text-[#f0ecec] placeholder:text-[#D1BB9E]/50 focus:border-[#cfcece] "
              />
            </div>

            <div className="relative">
              {!isConnected ? (
                <div className="text-center p-4 bg-[#1a1a1a]/60 text-[#ffffff] rounded-md border ">
                  Please connect your wallet to create a debate
                </div>
              ) : (
                <div className="relative">
                  {/* Background image */}
                  <div className="absolute inset-0">
                    <Image
                      src={"/rock_container.webp"} // Add your image path here
                      alt={"Background"}
                      fill
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>

                  {/* Transparent button */}
                  <button
                    type="submit"
                    disabled={isPending || !judgeAI}
                    className="relative w-full p-4 bg-transparent text-[#ffffff] font-semibold disabled:bg-transparent disabled:text-[#c3c2c2] transition-colors duration-200"
                  >
                    {isPending ? "Creating..." : "Create Debate with Market"}
                  </button>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={isPending}>
        <DialogContent className="bg-[#52362B] border-2 border-[#52362B]">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CCAA00]"></div>
            <p className="text-lg font-semibold text-[#CCAA00]">
              Transaction Being Processed
            </p>
            <p className="text-sm text-[#D1BB9E]">
              {isDebatePending || isConfirmingDebate
                ? "Creating debate..."
                : "Creating market..."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
