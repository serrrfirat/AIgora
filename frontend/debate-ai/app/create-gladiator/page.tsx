"use client";
import React, { useEffect, useRef } from "react";
import { CreateDebate } from "../../components/CreateDebate";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "sonner";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Check,
  ChevronRight,
  Code,
  Copy,
  Loader2,
  MessageSquare,
  Shield,
  Sword,
  Swords,
} from "lucide-react";
import Image from "next/image";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { GLADIATOR_NFT_ADDRESS, GLADIATOR_NFT_ABI } from "@/config/contracts";
import { MARKET_FACTORY_ADDRESS, MARKET_FACTORY_ABI } from "@/config/contracts";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";

interface GeneratedGladiator {
  name: string;
  image: string;
  description: string;
  speciality: string;
  stats: {
    strength: number;
    agility: number;
    intelligence: number;
  };
  ipfsUrl?: string;
}

const CreateGladiator = () => {
  const [gladiator, setGladiator] = useState<GeneratedGladiator | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMintingModal, setShowMintingModal] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);

  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(gladiator, null, 2));
    setCopied(true);
    toast.success("JSON copied to clipboard", {
      description: "The gladiator data has been copied to your clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Wagmi hooks for minting
  const { address, isConnected } = useAccount();
  const {
    writeContract,
    isPending: isMintPending,
    data: txHash,
  } = useWriteContract();
  const {
    isLoading: isMintConfirming,
    isSuccess: isMintSuccess,
    error: mintTxError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const coordinatorUrl = process.env.NEXT_PUBLIC_COORDINATOR_URL;

  async function handleSubmit(formData: FormData) {
    const twitterHandle = formData.get("twitter")?.toString().replace("@", "");

    if (!twitterHandle) {
      toast.error("Twitter handle required", {
        description:
          "Please enter a valid Twitter handle to generate a gladiator.",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    const promise = async () => {
      try {
        const response = await fetch(
          `${coordinatorUrl}/api/character/generate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username: twitterHandle }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to generate gladiator");
        }

        const characterData = await response.json();
        const gladiatorData: GeneratedGladiator = {
          name: characterData.name,
          image:
            process.env.NEXT_PUBLIC_DEFAULT_GLADIATOR_IMAGE ||
            "/placeholder-gladiator.png",
          description: characterData.bio.join(" "),
          speciality: characterData.topics[0] || "General Philosophy",
          stats: {
            strength: Math.min(100, characterData.topics.length * 20),
            agility: Math.min(100, characterData.postExamples.length * 5),
            intelligence: Math.min(100, characterData.adjectives.length * 25),
          },
          ipfsUrl: characterData.ipfsUrl,
        };

        setGladiator(gladiatorData);
        return gladiatorData;
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : "Failed to generate gladiator";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    toast.promise(promise(), {
      loading: "Generating your gladiator...",
      success: (data) => `${data.name} has been generated successfully!`,
      error: (err) => err.message,
    });
  }

  const handleMint = async () => {
    if (!gladiator || !address || !isConnected) {
      toast.error("Cannot mint gladiator", {
        description:
          "Please ensure your wallet is connected and a gladiator has been generated.",
      });
      return;
    }

    try {
      setMintError(null);

      const publicKey = Math.floor(Math.random() * 1000000).toString(16);

      // toast.promise(
      //   writeContract({
      //     address: MARKET_FACTORY_ADDRESS,
      //     abi: MARKET_FACTORY_ABI,
      //     functionName: "registerGladiator",
      //     args: [
      //       gladiator.name,
      //       gladiator.ipfsUrl || "",
      //       publicKey,
      //     ],
      //   }),
      //   {
      //     loading: 'Minting your gladiator NFT...',
      //     success: 'Gladiator NFT minted successfully!',
      //     error: (err) => `Failed to mint: ${err.message}`,
      //   }
      // );
      // --------

      // ----------
      await writeContract({
        address: MARKET_FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: "registerGladiator",
        args: [gladiator.name, gladiator.ipfsUrl || "", publicKey],
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to mint NFT";
      setMintError(errorMessage);
      toast.error("Minting failed", {
        description: errorMessage,
      });
    }
  };

  const toastShown = useRef({
    confirming: false,
    success: false,
    error: false,
  });

  useEffect(() => {
    if (isMintConfirming && !toastShown.current.confirming) {
      toast.info("Transaction is being confirmed...");
      toastShown.current.confirming = true;
    }

    if (isMintSuccess && !toastShown.current.success) {
      toast.success("Minting successful!");
      toastShown.current.success = true;
    }

    if (mintTxError && !toastShown.current.error) {
      toast.error(`Transaction failed: ${mintTxError.message}`);
      toastShown.current.error = true;
    }
  }, [isMintConfirming, isMintSuccess, mintTxError]);

  return (
    <div className="min-h-screen w-full relative">
      <Toaster position="bottom-right" expand={false} richColors closeButton />
      <div className="relative w-full max-w-7xl mx-auto px-4 py-6 min-h-screen flex items-start justify-center">
        <div className="hidden lg:block fixed left-0 bottom-0 pixelated-2 z-0">
          <Image
            src="/side_1.webp"
            alt="Julius Caesar Right"
            width={200}
            height={380}
            priority
            className="select-none"
          />
        </div>

        <div className="w-full lg:w-auto relative z-10">
          {!gladiator && (
            <div className="w-full max-w-md mx-auto relative">
              <Card className="bg-transparent border-2 border-[#9c9c9c] shadow-xl backdrop-blur-sm">
                <CardHeader className="space-y-1 pb-4">
                  <div>
                    <div className="text-2xl text-center text-[#b0222b] pixelated text-wrap mt-5">
                      CREATE GLADIATOR
                    </div>
                    <div className=" text-center pixelated-2 text-lg text-gray-800 text-wrap">
                      The arena awaits your brilliance
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="topic" className="text-[#3D3D3D]">
                        <div className="flex text-lg font-bold items-center gap-2">
                          <Sword className="w-5 h-5" />
                          Twitter Handle
                        </div>
                      </Label>

                      <Input
                        name="twitter"
                        placeholder="Enter Twitter handle (e.g. @example)"
                        className="bg-[#483535] border-[#D1BB9E]/20 text-[#f0ecec] placeholder:text-[#D1BB9E]/50 focus:border-[#cfcece] "
                        required
                      />
                    </div>

                    <div className="relative">
                      {!isConnected ? (
                        <div className="text-center p-4 bg-[#1a1a1a]/60 text-[#ffffff] rounded-md border ">
                          Please connect your wallet to create a gladiator
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="absolute inset-0">
                            <Image
                              src={"/rock_container.webp"}
                              alt={"Background"}
                              fill
                              className="w-full h-full object-cover rounded-md"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="relative w-full p-4 bg-transparent text-[#ffffff] font-semibold disabled:bg-transparent disabled:text-[#c3c2c2] transition-colors duration-200"
                          >
                            {isLoading ? "Creating..." : "Generate Gladiator"}
                          </button>
                        </div>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {gladiator && (
            <div className="max-w-5xl mx-auto p-6">
              <Card className="group overflow-hidden bg-[#52362B] border-2 border-[#52362B] rounded-lg shadow-xl hover:shadow-2xl transition-all">
                <div className="grid lg:grid-cols-2 gap-0">
                  {!showJson ? (
                    <>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#52362B] to-transparent z-10 opacity-40" />
                        <div className="aspect-square lg:aspect-auto lg:h-full">
                          <Image
                            src={gladiator.image}
                            alt={gladiator.name}
                            fill
                            className="object-cover"
                            priority
                          />
                        </div>
                        <div className="absolute top-4 right-4 flex items-center space-x-3 z-20">
                          <div className="flex items-center space-x-2 bg-[#52362B]/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#D1BB9E]/20">
                            <Code className="w-4 h-4 text-[#D1BB9E]" />
                            <span className="text-sm text-[#FAF9F6]">JSON</span>
                            <Switch
                              checked={showJson}
                              onCheckedChange={setShowJson}
                              className="data-[state=checked]:bg-[#CCAA00]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="relative p-6">
                        <div className="absolute top-0 right-0 w-20 h-20 -mt-10 -mr-10 rotate-45 bg-[#D1BB9E]/5" />

                        <div className="flex flex-col h-full">
                          <div className="mb-4">
                            <h2 className="text-2xl font-bold mb-2 text-[#CCAA00] tracking-tight">
                              {gladiator.name}
                            </h2>
                            <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
                              {gladiator.description}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 py-3 border-y border-[#FAF9F6]/10">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#FAF9F6]/10 flex items-center justify-center">
                                <Sword className="w-4 h-4 text-[#FAF9F6]" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-400">
                                  Speciality
                                </span>
                                <span className="text-sm text-[#FAF9F6]">
                                  {gladiator.speciality}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#FAF9F6]/10 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-[#FAF9F6]" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-400">
                                  Class
                                </span>
                                <Badge className="bg-[#D1BB9E] text-[#52362B] hover:bg-[#D1BB9E]/80 w-fit">
                                  Warrior
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 py-4">
                            <h3 className="text-[#D1BB9E] font-semibold text-sm mb-3">
                              Combat Stats
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                              {Object.entries(gladiator.stats).map(
                                ([stat, value]) => (
                                  <div key={stat} className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                      <span className="capitalize text-gray-400">
                                        {stat}
                                      </span>
                                      <span className="text-[#FAF9F6]">
                                        {value}%
                                      </span>
                                    </div>
                                    <div className="h-1.5 bg-[#3B2820] rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-[#CCAA00] to-[#D1BB9E] transition-all duration-500 ease-out"
                                        style={{ width: `${value}%` }}
                                      />
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          <Button
                            className="w-full bg-[#CCAA00] hover:bg-[#CCAA00]/90 text-[#52362B] font-semibold h-10"
                            onClick={handleMint}
                            disabled={
                              !isConnected || isMintPending || isMintConfirming
                            }
                          >
                            {isMintPending || isMintConfirming ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Forging NFT...
                              </>
                            ) : !isConnected ? (
                              "Connect Wallet to Claim"
                            ) : (
                              <>
                                Mint as NFT
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 p-6">
                      <div className="relative">
                        <div className="flex items-center w-fit space-x-2 bg-[#52362B]/90 backdrop-blur-sm px-2 py-2 rounded-full border border-[#D1BB9E]/20">
                          <Code className="w-4 h-4 text-[#D1BB9E]" />
                          <span className="text-sm text-[#FAF9F6]">JSON</span>
                          <Switch
                            checked={showJson}
                            onCheckedChange={setShowJson}
                            className="data-[state=checked]:bg-[#CCAA00]"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute right-2 top-2 text-[#D1BB9E] border-[#D1BB9E]/20 hover:bg-[#D1BB9E]/10"
                          onClick={handleCopy}
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <pre className="bg-[#3B2820] p-6 rounded-lg overflow-auto max-h-[400px] text-sm text-[#FAF9F6]/80 border border-[#D1BB9E]/20">
                          {JSON.stringify(gladiator, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>

        <div className="hidden lg:block fixed right-0 bottom-0 z-0">
          <Image
            src="/side_2.webp"
            alt="Julius Caesar Right"
            width={200}
            height={380}
            priority
            className="select-none"
          />
        </div>
      </div>
    </div>
  );
};

export default CreateGladiator;
