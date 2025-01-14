import { Abi } from "viem";
import { useReadContract } from "wagmi";
import { MARKET_FACTORY_ABI, MARKET_FACTORY_ADDRESS } from "@/config/contracts";
import { GladiatorCard } from "./gladiator-card"
import { useRouter } from 'next/navigation';

export function GladiatorsGrid() {
  interface Gladiator {
    aiAddress: string;
    name: string;
    isActive: boolean;
    publicKey: string;
  }

  const router = useRouter();

  const { data: gladiators } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'getAllGladiators',
  }) as { data: Gladiator[] };

  if (!gladiators) {
    return <div>Loading gladiators...</div>;
  }

  console.log("Gladiators", gladiators);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Gladiators</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {gladiators.map((gladiator: Gladiator) => (
          <GladiatorCard key={gladiator.aiAddress} {...gladiator} />
        ))}
      </div>
    </div>
  )
}
