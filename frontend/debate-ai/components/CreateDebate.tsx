'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAccount, useContractWrite, usePrepareContractWrite, useNetwork } from 'wagmi';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI } from '@/config/contracts';

export function CreateDebate() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(7); // Default 7 days
  const [judges, setJudges] = useState<string[]>(['']); // Start with one judge input

  const durationInSeconds = duration * 24 * 60 * 60; // Convert days to seconds

  const { config, error: prepareError } = usePrepareContractWrite({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI,
    functionName: 'createDebate',
    args: [
      topic,
      durationInSeconds,
      process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`,
      {
        bondingTarget: 1000 * 10**18, // 1000 USDC
        bondingDuration: 24 * 60 * 60, // 1 day
        basePrice: 0.1 * 10**18, // 0.1 USDC
        minimumDuration: 24 * 60 * 60 // 1 day
      },
      judges.filter(j => j !== '') as `0x${string}`[]
    ],
    enabled: Boolean(isConnected && topic && duration && judges.length > 0 && address)
  });

  const { write: createDebate, isLoading, error: writeError } = useContractWrite(config);

  // Debug logging
  useEffect(() => {
    console.log('Debug Info:', {
      factoryAddress: DEBATE_FACTORY_ADDRESS,
      userAddress: address,
      isConnected,
      chainId: chain?.id,
      chainName: chain?.name,
      topic,
      duration,
      judges: judges.filter(j => j !== ''),
      hasConfig: !!config,
      hasWrite: !!createDebate,
      isLoading,
      prepareError,
      writeError,
      enabled: Boolean(isConnected && topic && duration && judges.length > 0 && address)
    });
  }, [address, isConnected, chain, topic, duration, judges, config, createDebate, isLoading, prepareError, writeError]);

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
    if (createDebate) {
      createDebate();
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
          <p>Network: {chain?.name || 'Unknown'}</p>
          <p>Has config: {config ? 'Yes' : 'No'}</p>
          <p>Can write: {createDebate ? 'Yes' : 'No'}</p>
          <p>Is loading: {isLoading ? 'Yes' : 'No'}</p>
          {prepareError && <p className="text-red-500">Prepare error: {prepareError.message}</p>}
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
              disabled={isLoading || !createDebate}
              className="w-full"
            >
              {isLoading ? 'Creating...' : 'Create Debate'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
} 