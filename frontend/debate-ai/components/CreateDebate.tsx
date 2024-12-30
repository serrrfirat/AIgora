'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI, MARKET_FACTORY_ADDRESS, MARKET_FACTORY_ABI, REQUIRED_JUDGES, MOCK_TOKEN_ADDRESS } from '@/config/contracts';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { Dialog, DialogContent } from './ui/dialog';
import { decodeEventLog, Log } from 'viem';

const OUTCOME_NAMES = [
  "Strongly Disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly Agree"
];

const DEFAULT_BONDING_TARGET = BigInt(1000) * BigInt(10**18); // 1000 tokens
const DEFAULT_BONDING_DURATION = 7 * 24 * 60 * 60; // 7 days
const DEFAULT_BASE_PRICE = 100; // $0.01 in basis points

interface DebateCreatedEvent {
  eventName: 'DebateCreated';
  args: {
    debateId: bigint;
    topic: string;
    duration: bigint;
    totalRounds: bigint;
    judges: string[];
  };
}

export function CreateDebate() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('7');
  const [rounds, setRounds] = useState('5');
  const [judges, setJudges] = useState<string[]>(['']);

  const { data: debateHash, writeContract: writeDebate, error: writeError, isPending: isDebatePending } = useWriteContract();

  const { data: marketHash, writeContract: writeMarket, isPending: isMarketPending } = useWriteContract();

  const { isLoading: isConfirmingDebate, isSuccess: isDebateSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: debateHash,
  });

  const { isLoading: isConfirmingMarket } = useWaitForTransactionReceipt({
    hash: marketHash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validJudges = judges.filter(j => j.trim() !== '');
    
    writeDebate({
      address: DEBATE_FACTORY_ADDRESS,
      abi: DEBATE_FACTORY_ABI,
      functionName: 'createDebate',
      args: [topic, BigInt(Number(duration) * 24 * 60 * 60), BigInt(rounds), validJudges],
    });
  };

  // Create market when debate is created
  useEffect(() => {
    if (isDebateSuccess && receipt?.logs) {
      try {
        // Find DebateCreated event
        const log = receipt.logs.find((log: Log) => {
          try {
            const event = decodeEventLog({
              abi: DEBATE_FACTORY_ABI,
              ...log,
            });
            return event.eventName === 'DebateCreated';
          } catch {
            return false;
          }
        });

        if (log) {
          const decodedEvent = decodeEventLog({
            abi: DEBATE_FACTORY_ABI,
            ...log,
          });

          if (decodedEvent.eventName === 'DebateCreated' && decodedEvent.args && 'debateId' in decodedEvent.args) {
            writeMarket({
              address: MARKET_FACTORY_ADDRESS,
              abi: MARKET_FACTORY_ABI,
              functionName: 'createMarket',
              args: [
                MOCK_TOKEN_ADDRESS,
                decodedEvent.args.debateId,
                OUTCOME_NAMES,
                DEFAULT_BONDING_TARGET,
                DEFAULT_BONDING_DURATION,
                DEFAULT_BASE_PRICE
              ],
            });
          }
        }
      } catch (error) {
        console.error('Error creating market:', error);
      }
    }
  }, [isDebateSuccess, receipt, writeMarket]);

  const addJudge = () => {
    setJudges([...judges, '']);
  };

  const updateJudge = (index: number, value: string) => {
    const newJudges = [...judges];
    newJudges[index] = value;
    setJudges(newJudges);
  };

  const isPending = isDebatePending || isMarketPending || isConfirmingDebate || isConfirmingMarket;

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
                disabled={isPending || judges.filter(j => j !== '').length < REQUIRED_JUDGES}
                className="w-full"
              >
                {isPending ? 'Creating...' : 'Create Debate with Market'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Dialog open={isPending} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-lg font-semibold">Transaction Being Processed</p>
            <p className="text-sm text-gray-500">
              {isDebatePending || isConfirmingDebate 
                ? 'Creating debate...' 
                : 'Creating market...'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 