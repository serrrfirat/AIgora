'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI, REQUIRED_JUDGES } from '@/config/contracts';
import { useAccount, useChainId, useWalletClient, useWriteContract } from 'wagmi';

export function CreateDebate() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(7); // Default 7 days
  const [totalRounds, setTotalRounds] = useState(5); // Default 5 rounds
  const [judges, setJudges] = useState<string[]>(['']); // Start with one judge input
  const [isSubmitting, setIsSubmitting] = useState(false);

  const durationInSeconds = duration * 24 * 60 * 60; // Convert days to seconds

  const { writeContract: createDebate, isPending: isPending, error: writeError } = useWriteContract();

  const handleCreateDebate = async () => {
    if (!createDebate || !walletClient) return;

    try {
      setIsSubmitting(true);
      createDebate({
        args: [
          topic,
          BigInt(durationInSeconds),
          BigInt(totalRounds),
          judges.filter(j => j !== '') as `0x${string}`[]
        ],
        abi: DEBATE_FACTORY_ABI,
        functionName: 'createDebate',
        address: DEBATE_FACTORY_ADDRESS,
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
      totalRounds,
      judges: judges.filter(j => j !== ''),
      hasWrite: !!createDebate,
      isPending,
      writeError,
      enabled: Boolean(isConnected && topic && duration && judges.length >= REQUIRED_JUDGES && address)
    });
  }, [address, isConnected, chainId, topic, duration, totalRounds, judges, createDebate, isPending, writeError]);

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
            <Label htmlFor="totalRounds">Number of Rounds</Label>
            <Input
              id="totalRounds"
              type="number"
              min="1"
              max="10"
              value={totalRounds}
              onChange={(e) => setTotalRounds(Number(e.target.value))}
              required
            />
            <p className="text-sm text-gray-500">Each round requires {REQUIRED_JUDGES} judges to score</p>
          </div>

          <div className="space-y-2">
            <Label>Judges (minimum {REQUIRED_JUDGES})</Label>
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
              disabled={isPending || isSubmitting || judges.filter(j => j !== '').length < REQUIRED_JUDGES}
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