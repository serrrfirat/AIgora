'use client';

import { useReadContract } from 'wagmi';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI } from '@/config/contracts';
import { Card } from './ui/card';

export function DebateList() {
  const { data: debates  } = useReadContract({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'getAllDebates',
  }) as { data: bigint[] | undefined };

  return (
    <div className="space-y-4 p-4">
      {debates?.map((debateId) => (
        <Card key={debateId.toString()} className="p-4">
          <h3 className="text-lg font-semibold">Debate #{debateId.toString()}</h3>
        </Card>
      ))}
    </div>
  );
}