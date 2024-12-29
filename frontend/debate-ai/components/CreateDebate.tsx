'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI } from '@/config/contracts';
import { useAccount, useChainId, useWalletClient, useWriteContract } from 'wagmi';

export function CreateDebate() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(7); // Default 7 days
  const [judges, setJudges] = useState<string[]>(['']); // Start with one judge input
  const [isSubmitting, setIsSubmitting] = useState(false);

  const durationInSeconds = duration * 24 * 60 * 60; // Convert days to seconds

  const { writeContract, isPending, error: writeError } = useWriteContract();

  const handleCreateDebate = async () => {
    if (!writeContract || !walletClient) return;

    try {
      setIsSubmitting(true);
      await writeContract({
        address: DEBATE_FACTORY_ADDRESS,
        abi: DEBATE_FACTORY_ABI,
        functionName: 'createDebate',
        args: [
          topic,
          durationInSeconds,
          process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`,
          {
            bondingTarget: 1000n * 10n**18n, // 1000 USDC
            bondingDuration: 24n * 60n * 60n, // 1 day
            basePrice: 1n * 10n**17n, // 0.1 USDC
            minimumDuration: 24n * 60n * 60n // 1 day
          },
          judges.filter(j => j !== '') as `0x${string}`[]
        ]
      });
    } catch (error) {
      console.error('Error creating debate:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('Debug Info:', {
      factoryAddress: DEBATE_FACTORY_ADDRESS,
      userAddress: address,
      isConnected,
      chainId,
      topic,
      duration,
      judges: judges.filter(j => j !== ''),
      hasWrite: !!writeContract,
      isPending,
      writeError,
      enabled: Boolean(isConnected && topic && duration && judges.length > 0 && address)
    });
  }, [address, isConnected, chainId, topic, duration, judges, writeContract, isPending, writeError]);

  const addJudge = () => {
    setJudges([...judges, '']);
  };

  const updateJudge = (index: number, value: string) => {
    const newJudges = [...judges];
    newJudges[index] = value;
    setJudges(newJudges);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (handleCreateDebate) {
      handleCreateDebate();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a New Debate</CardTitle>
        <CardDescription>
          Set up a new debate topic and define its parameters
        </CardDescription>
        {/* Debug info display */}
        <div className="text-sm text-gray-500 mt-2">
          <p>Wallet connected: {isConnected ? 'Yes' : 'No'}</p>
          <p>Wallet address: {address || 'Not connected'}</p>
          <p>Network: {chainId}</p>
          <p>Can write: {!writeError ? 'Yes' : 'No'}</p>
          <p>Is pending: {isPending ? 'Yes' : 'No'}</p>
          {writeError && <p className="text-red-500">Write error: {writeError.message}</p>}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              placeholder="Enter debate topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the debate topic"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (days)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Judges</Label>
            {judges.map((judge, index) => (
              <Input
                key={index}
                placeholder={`Judge ${index + 1} address`}
                value={judge}
                onChange={(e) => updateJudge(index, e.target.value)}
                className="mb-2"
                required
              />
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addJudge}
              className="mt-2"
            >
              Add Judge
            </Button>
          </div>

          {!isConnected ? (
            <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-md">
              Please connect your wallet to create a debate
            </div>
          ) : (
            <Button
              type="submit"
              disabled={isPending || isSubmitting}
              className="w-full"
            >
              {isPending || isSubmitting ? 'Creating...' : 'Create Debate'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
} 