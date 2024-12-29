'use client';

import { useParams } from 'next/navigation';
import { useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEBATE_ABI, DEBATE_FACTORY_ABI } from '@/config/contracts';
import { useState } from 'react';

interface DebateInfo {
  topic: string;
  startTime: bigint;
  endTime: bigint;
  currentRound: number;
  totalRounds: number;
  isActive: boolean;
  market: `0x${string}`;
}

export default function DebatePage() {
  const { id } = useParams();
  const [selectedOutcome, setSelectedOutcome] = useState(0);
  const [orderAmount, setOrderAmount] = useState('');
  const [orderPrice, setOrderPrice] = useState('');

  const { data: debateInfo } = useContractRead({
    address: id as `0x${string}`,
    abi: DEBATE_ABI,
    functionName: 'getDebateInfo',
    watch: true,
  }) as { data: DebateInfo | undefined };

  const { data: market } = useContractRead({
    address: id as `0x${string}`,
    abi: DEBATE_ABI,
    functionName: 'market',
    watch: true,
  });

  const { config: placeLimitOrderConfig } = usePrepareContractWrite({
    address: market as `0x${string}`,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'placeLimitOrder',
    args: [
      selectedOutcome,
      BigInt(Number(orderPrice) * 100), // Convert to basis points
      BigInt(Number(orderAmount) * 10**18), // Convert to wei
    ],
    enabled: Boolean(market && orderAmount && orderPrice),
  });

  const { write: placeLimitOrder, isLoading: isPlacingOrder } = useContractWrite(placeLimitOrderConfig);

  if (!debateInfo) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading debate information...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePlaceOrder = () => {
    if (placeLimitOrder) {
      placeLimitOrder();
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{debateInfo.topic}</CardTitle>
          <CardDescription>
            Round {debateInfo.currentRound} of {debateInfo.totalRounds}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Start Time</p>
              <p>{new Date(Number(debateInfo.startTime) * 1000).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Time</p>
              <p>{new Date(Number(debateInfo.endTime) * 1000).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trading</CardTitle>
          <CardDescription>Place orders for debate outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="limit" className="w-full">
            <TabsList>
              <TabsTrigger value="limit">Limit Order</TabsTrigger>
              <TabsTrigger value="market">Market Order</TabsTrigger>
            </TabsList>

            <TabsContent value="limit">
              <div className="space-y-4">
                <div>
                  <Label>Select Outcome</Label>
                  <select
                    className="w-full p-2 border rounded"
                    value={selectedOutcome}
                    onChange={(e) => setSelectedOutcome(Number(e.target.value))}
                  >
                    <option value={0}>Outcome A</option>
                    <option value={1}>Outcome B</option>
                    <option value={2}>Outcome C</option>
                  </select>
                </div>

                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Price (in %)</Label>
                  <Input
                    type="number"
                    placeholder="Enter price"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder || !placeLimitOrder}
                  className="w-full"
                >
                  {isPlacingOrder ? 'Placing Order...' : 'Place Limit Order'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="market">
              <div className="text-center py-4">
                Market orders coming soon!
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 