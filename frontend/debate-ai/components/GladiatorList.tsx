import { useReadContract, useReadContracts } from 'wagmi';
import { MARKET_FACTORY_ADDRESS, MARKET_FACTORY_ABI } from '@/config/contracts';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { formatAddress } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Abi } from 'viem';

interface Gladiator {
  aiAddress: string;
  name: string;
  index: number;
  isActive: boolean;
  publicKey: string;
}

export function GladiatorList() {
  const router = useRouter();

  // Get all market IDs
  const { data: marketCount } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: 'marketCount',
  });

  // Create an array of market IDs from 0 to marketCount-1
  const marketIds = marketCount 
    ? Array.from({ length: Number(marketCount) }, (_, i) => BigInt(i))
    : [];

  // Get gladiators for each market
  const { data: gladiatorsPerMarket } = useReadContracts({
    contracts: marketIds.map((id) => ({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      functionName: 'getGladiators',
      args: [id],
    })) as { abi?: Abi | undefined; functionName?: string | undefined; args?: readonly unknown[] | undefined; address?: `0x${string}` | undefined; chainId?: number | undefined }[],
  });

  // Get market details for each market
  const { data: marketDetails } = useReadContracts({
    contracts: marketIds.map((id) => ({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI,
      functionName: 'getMarketDetails',
      args: [id],
    })) as { abi?: Abi | undefined; functionName?: string | undefined; args?: readonly unknown[] | undefined; address?: `0x${string}` | undefined; chainId?: number | undefined }[],
  });

  const handleGladiatorClick = (marketId: string) => {
    router.push(`/debate/${marketId}`);
  };

  return (
    <div className="space-y-4 p-4">
      {gladiatorsPerMarket?.map((result, marketIndex) => {
        const gladiators = result.result as Gladiator[] | undefined;
        const marketDetail = marketDetails?.[marketIndex]?.result as [string, bigint, boolean, bigint, bigint] | undefined;
        if (!gladiators || !marketDetail) return null;

        const [token, debateId, resolved, winningGladiator, totalBondingAmount] = marketDetail;

        return gladiators.map((gladiator) => (
          <Card 
            key={`${marketIndex}-${gladiator.index}`}
            className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleGladiatorClick(marketIndex.toString())}
          >
            <CardContent className="p-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">{gladiator.name}</h3>
                  <p className="text-sm text-gray-600">Address: {formatAddress(gladiator.aiAddress)}</p>
                  <p className="text-sm text-gray-600">Market ID: #{marketIndex}</p>
                  <p className="text-sm text-gray-600">
                    Status: {gladiator.isActive ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-red-600">Inactive</span>
                    )}
                  </p>
                  {resolved && winningGladiator === BigInt(gladiator.index) && (
                    <p className="text-sm text-emerald-600 font-semibold">Winner!</p>
                  )}
                </div>
                <Button variant="outline" size="sm">
                  View Debates
                </Button>
              </div>
            </CardContent>
          </Card>
        ));
      })}
    </div>
  );
} 