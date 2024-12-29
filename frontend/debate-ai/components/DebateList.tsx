'use client';

import { useContractRead } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI, DEBATE_ABI } from '@/config/contracts';
import { useRouter } from 'next/navigation';

interface DebateInfo {
  topic: string;
  startTime: bigint;
  endTime: bigint;
  currentRound: number;
  totalRounds: number;
  isActive: boolean;
  market: `0x${string}`;
}

export function DebateList() {
  const router = useRouter();

  const { data: debates = [], isLoading } = useContractRead({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getAllDebates',
    watch: true,
  }) as { data: `0x${string}`[] | undefined; isLoading: boolean };

  const { data: debateCount } = useContractRead({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getDebateCount',
    watch: true,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading debates...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Active Debates</CardTitle>
          <CardDescription>
            Total Debates: {debateCount?.toString() || '0'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {debates.length === 0 ? (
            <div className="text-center py-4">
              No active debates found. Create one to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {debates.map((debateAddress) => (
                <DebateCard
                  key={debateAddress}
                  address={debateAddress}
                  onClick={() => router.push(`/debates/${debateAddress}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DebateCard({ address, onClick }: { address: `0x${string}`; onClick: () => void }) {
  const { data: debateInfo } = useContractRead({
    address,
    abi: DEBATE_ABI,
    functionName: 'getDebateInfo',
  }) as { data: DebateInfo | undefined };

  if (!debateInfo) return null;

  return (
    <Card className="hover:bg-accent/50 cursor-pointer" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">{debateInfo.topic}</h3>
            <p className="text-sm text-muted-foreground">
              Status: {debateInfo.isActive ? 'Active' : 'Completed'}
            </p>
            <p className="text-sm text-muted-foreground">
              Round: {debateInfo.currentRound} of {debateInfo.totalRounds}
            </p>
          </div>
          <Button variant="outline">View Details</Button>
        </div>
      </CardContent>
    </Card>
  );
} 