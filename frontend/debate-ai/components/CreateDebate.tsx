'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI, REQUIRED_JUDGES } from '@/config/contracts';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { Dialog, DialogContent } from './ui/dialog';

export function CreateDebate() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('7');
  const [rounds, setRounds] = useState('5');
  const [judges, setJudges] = useState<string[]>(['']);

  const { data: hash, writeContract, error: writeError, isPending } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  const addJudge = () => {
    setJudges([...judges, '']);
  };

  const updateJudge = (index: number, value: string) => {
    const newJudges = [...judges];
    newJudges[index] = value;
    setJudges(newJudges);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validJudges = judges.filter(j => j.trim() !== '');
    
    writeContract({
      address: DEBATE_FACTORY_ADDRESS,
      abi: DEBATE_FACTORY_ABI,
      functionName: 'createDebate',
      args: [topic, BigInt(Number(duration) * 24 * 60 * 60), BigInt(rounds), validJudges],
    });
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
      rounds,
      judges: judges.filter(j => j !== ''),
      isPending,
      writeError,
      hash
    });
  }, [address, isConnected, chainId, topic, duration, rounds, judges, isPending, writeError, hash]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Create a New Debate</CardTitle>
          <CardDescription>Set up a new debate topic and define its parameters</CardDescription>
          <div className="text-sm text-gray-500 mt-2">
            <p>Wallet connected: {isConnected ? 'Yes' : 'No'}</p>
            <p>Wallet address: {address || 'Not connected'}</p>
            <p>Network: {chainId}</p>
            <p>Can write: {!writeError ? 'Yes' : 'No'}</p>
            <p>Is pending: {isPending ? 'Yes' : 'No'}</p>
            {writeError && <p className="text-red-500">Error: {writeError.message}</p>}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter debate topic"
                required
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                required
              />
            </div>
            <div>
              <Label htmlFor="rounds">Number of Rounds</Label>
              <Input
                id="rounds"
                type="number"
                value={rounds}
                onChange={(e) => setRounds(e.target.value)}
                min="1"
                required
              />
            </div>
            <div>
              <Label>Judges (minimum {REQUIRED_JUDGES})</Label>
              {judges.map((judge, index) => (
                <Input
                  key={index}
                  value={judge}
                  onChange={(e) => updateJudge(index, e.target.value)}
                  placeholder={`Judge ${index + 1} address`}
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
                disabled={isPending || isConfirming || judges.filter(j => j !== '').length < REQUIRED_JUDGES}
                className="w-full"
              >
                {isPending || isConfirming ? 'Creating...' : 'Create Debate'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Dialog open={isConfirming} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-lg font-semibold">Transaction Being Processed</p>
            <p className="text-sm text-gray-500">Please wait while your debate is being created...</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 