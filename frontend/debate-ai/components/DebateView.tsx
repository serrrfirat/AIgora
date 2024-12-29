'use client';

import { useState } from 'react';
import { useReadContract, useWriteContract } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEBATE_ABI, DEBATE_MARKET_ABI } from '@/config/contracts';

interface DebateInfo {
  topic: string;
  startTime: bigint;
  endTime: bigint;
  currentRound: number;
  totalRounds: number;
  isActive: boolean;
  market: `0x${string}`;
}

interface DebateViewProps {
  address: `0x${string}`;
}

export function DebateView({ address }: DebateViewProps) {
  const [selectedOutcome, setSelectedOutcome] = useState(0);
  const [orderAmount, setOrderAmount] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [score, setScore] = useState(5); // Default score

  const { data: debateInfo } = useReadContract({
    address,
    abi: DEBATE_ABI,
    functionName: 'getDebateInfo',
  }) as { data: DebateInfo | undefined };

  const { data: roundScores } = useReadContract({
    address,
    abi: DEBATE_ABI,
    functionName: 'getRoundScores',
    args: [debateInfo?.currentRound ?? 0],
  }) as { data: bigint[] | undefined };

  const orderAmountWei = Math.floor(Number(orderAmount) * 10**18);
  const orderPriceBasisPoints = Math.floor(Number(orderPrice) * 100);

  const { writeContract: placeLimitOrder, isPending: isPlacingOrder } = useWriteContract();

  const { writeContract: scoreRound, isPending: isScoring } = useWriteContract();

  const handlePlaceOrder = () => {
    placeLimitOrder({
      address: debateInfo?.market as `0x${string}`,
      abi: DEBATE_MARKET_ABI,
      functionName: 'placeLimitOrder',
      args: [selectedOutcome, orderPriceBasisPoints, orderAmountWei],
    });
  };

  const handleScoreRound = () => {
    scoreRound({
      address,
      abi: DEBATE_ABI,
      functionName: 'scoreRound',
      args: [debateInfo?.currentRound ?? 0, score],
    });
  };

  if (!debateInfo) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading debate information...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
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

      <Card>
        <CardHeader>
          <CardTitle>Judge Panel</CardTitle>
          <CardDescription>Score the current round</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Score (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
              />
            </div>
            <Button
              onClick={handleScoreRound}
              disabled={isScoring || !scoreRound || !debateInfo.isActive}
              className="w-full"
            >
              {isScoring ? 'Scoring...' : 'Score Round'}
            </Button>
          </div>
          {roundScores && roundScores.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Current Round Scores</p>
              <div className="flex gap-2">
                {roundScores.map((score, index) => (
                  <div key={index} className="p-2 bg-secondary rounded">
                    {Number(score)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 