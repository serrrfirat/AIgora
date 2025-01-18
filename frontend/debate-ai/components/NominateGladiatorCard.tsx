// 'use client';

// import { Card, CardContent } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
// import { MARKET_FACTORY_ADDRESS, MARKET_FACTORY_ABI, GLADIATOR_NFT_ADDRESS, GLADIATOR_NFT_ABI } from '@/config/contracts';
// import { formatAddress } from '@/lib/utils';

// type Gladiator = {
//   aiAddress: string;
//   name: string;
//   index: bigint;
//   isActive: boolean;
//   publicKey: string;
// };

// interface NominateGladiatorCardProps {
//   marketId: bigint | undefined;
//   isBondingCurveFulfilled: boolean;
// }

// export function NominateGladiatorCard({ marketId, isBondingCurveFulfilled }: NominateGladiatorCardProps) {
//   const { isConnected, address } = useAccount();

//   // Get user's NFTs
//   const { data: totalSupply } = useReadContract({
//     address: GLADIATOR_NFT_ADDRESS,
//     abi: GLADIATOR_NFT_ABI,
//     functionName: 'totalSupply',
//   });

//   const tokenIndices = totalSupply
//     ? Array.from({ length: Number(totalSupply) }, (_, i) => i)
//     : [];

//   // Get owner of each token
//   const { data: tokenOwners } = useReadContracts({
//     contracts: tokenIndices.map(index => ({
//       address: GLADIATOR_NFT_ADDRESS,
//       abi: GLADIATOR_NFT_ABI as any,
//       functionName: 'ownerOf',
//       args: [BigInt(index + 1)],
//     })),
//   });

//   // Get gladiator details for owned NFTs
//   const { data: myGladiators } = useReadContract({
//     address: MARKET_FACTORY_ADDRESS,
//     abi: MARKET_FACTORY_ABI,
//     functionName: 'getAllGladiators',
//   }) as { data: Gladiator[] };

//   // Nominate gladiator transaction
//   const {
//     data: nominateHash,
//     isPending: isNominatePending,
//     writeContract: nominateGladiator
//   } = useWriteContract();

//   const { isLoading: isNominateConfirming } = useWaitForTransactionReceipt({
//     hash: nominateHash,
//   });

//   // Filter gladiators owned by the current user
//   const ownedGladiators = myGladiators?.filter((_, index) => {
//     const ownerResult = tokenOwners?.[index];
//     return ownerResult?.result === address;
//   }) || [];

//   const handleNominate = async (tokenId: bigint) => {
//     if (!marketId) return;

//     try {
//       await nominateGladiator({
//         address: MARKET_FACTORY_ADDRESS,
//         abi: MARKET_FACTORY_ABI,
//         functionName: 'nominateGladiator',
//         args: [marketId, tokenId],
//       });
//     } catch (error) {
//       console.error('Error nominating gladiator:', error);
//     }
//   };

//   // Don't show the card if conditions aren't met
//   if (isBondingCurveFulfilled || !isConnected || ownedGladiators.length === 0) {
//     return null;
//   }

//   return (
//     <Card className="bg-[#1C2128] border-0">
//       <CardContent className="p-6">
//         <h3 className="text-lg font-bold text-white mb-4">Nominate Your Gladiator</h3>
//         <p className="text-sm text-gray-400 mb-6">As an NFT holder, you can nominate your gladiator to participate in this debate.</p>
//         <div className="space-y-3">
//           {ownedGladiators.map((gladiator, index) => (
//             <div key={index} className="bg-[#2D333B] rounded-lg p-4 space-y-3">
//               <div>
//                 <h4 className="font-medium text-white">{gladiator.name}</h4>
//                 <p className="text-sm text-gray-400">{formatAddress(gladiator.aiAddress)}</p>
//               </div>
//               <Button
//                 onClick={() => handleNominate(BigInt(index + 1))}
//                 disabled={isNominatePending || isNominateConfirming}
//                 className="w-full bg-blue-500 hover:bg-blue-600"
//               >
//                 {isNominatePending || isNominateConfirming ? (
//                   <div className="flex items-center justify-center gap-2">
//                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
//                     Nominating...
//                   </div>
//                 ) : (
//                   'Nominate'
//                 )}
//               </Button>
//             </div>
//           ))}
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  MARKET_FACTORY_ADDRESS,
  MARKET_FACTORY_ABI,
  GLADIATOR_NFT_ADDRESS,
  GLADIATOR_NFT_ABI,
} from "@/config/contracts";
import { formatAddress } from "@/lib/utils";
import { Sword } from "lucide-react";

type Gladiator = {
  aiAddress: string;
  name: string;
  index: bigint;
  isActive: boolean;
  publicKey: string;
};

interface NominateGladiatorCardProps {
  marketId: bigint | undefined;
  isBondingCurveFulfilled: boolean;
}

export function NominateGladiatorCard({
  marketId,
  isBondingCurveFulfilled,
}: NominateGladiatorCardProps) {
  const { isConnected, address } = useAccount();

  // Get user's NFTs
  const { data: totalSupply } = useReadContract({
    address: GLADIATOR_NFT_ADDRESS,
    abi: GLADIATOR_NFT_ABI,
    functionName: "totalSupply",
  });

  const tokenIndices = totalSupply
    ? Array.from({ length: Number(totalSupply) }, (_, i) => i)
    : [];

  // Get owner of each token
  const { data: tokenOwners } = useReadContracts({
    contracts: tokenIndices.map((index) => ({
      address: GLADIATOR_NFT_ADDRESS,
      abi: GLADIATOR_NFT_ABI as any,
      functionName: "ownerOf",
      args: [BigInt(index + 1)],
    })),
  });

  // Get gladiator details for owned NFTs
  const { data: myGladiators } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: "getAllGladiators",
  }) as { data: Gladiator[] };

  // Nominate gladiator transaction
  const {
    data: nominateHash,
    isPending: isNominatePending,
    writeContract: nominateGladiator,
  } = useWriteContract();

  const { isLoading: isNominateConfirming } = useWaitForTransactionReceipt({
    hash: nominateHash,
  });

  // Filter gladiators owned by the current user
  const ownedGladiators =
    myGladiators?.filter((_, index) => {
      const ownerResult = tokenOwners?.[index];
      return ownerResult?.result === address;
    }) || [];

  const handleNominate = async (tokenId: bigint) => {
    if (!marketId) return;

    try {
      await nominateGladiator({
        address: MARKET_FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: "nominateGladiator",
        args: [marketId, tokenId],
      });
    } catch (error) {
      console.error("Error nominating gladiator:", error);
    }
  };

  // Don't show the card if conditions aren't met
  if (isBondingCurveFulfilled || !isConnected || ownedGladiators.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-[#52362B] to-[#3B2820] border border-[#D1BB9E]/20 shadow-xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#2A1B15] border border-[#D1BB9E]/20 flex items-center justify-center">
            <Sword className="w-4 h-4 text-[#FFD700]" />
          </div>
          <h3 className="text-xl font-medium bg-gradient-to-r from-[#FFD700] to-[#CCAA00] bg-clip-text text-transparent">
            Nominate Your Gladiator
          </h3>
        </div>

        <p className="text-sm text-[#E6D5C3] mb-6 leading-relaxed">
          As an NFT holder, you can nominate your gladiator to participate in
          this debate.
        </p>

        <div className="space-y-4">
          {ownedGladiators.map((gladiator, index) => (
            <div
              key={index}
              className="bg-[#2A1B15] rounded-lg p-4 space-y-4 border border-[#D1BB9E]/20 hover:border-[#D1BB9E]/40 transition-colors"
            >
              <div className="space-y-1">
                <h4 className="font-medium text-[#E6D5C3]">{gladiator.name}</h4>
                <p className="text-sm text-[#D1BB9E]/60 font-mono">
                  {formatAddress(gladiator.aiAddress)}
                </p>
              </div>

              <Button
                onClick={() => handleNominate(BigInt(index + 1))}
                disabled={isNominatePending || isNominateConfirming}
                className="w-full bg-gradient-to-r from-[#FFD700] to-[#CCAA00] text-[#2A1B15] hover:from-[#FFE44D] hover:to-[#DDB700] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isNominatePending || isNominateConfirming ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#2A1B15]"></div>
                    Nominating...
                  </div>
                ) : (
                  "Nominate"
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
