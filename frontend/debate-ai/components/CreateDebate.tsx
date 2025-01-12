'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { DEBATE_FACTORY_ADDRESS, DEBATE_FACTORY_ABI, MARKET_FACTORY_ADDRESS, MARKET_FACTORY_ABI, MOCK_TOKEN_ADDRESS } from '@/config/contracts';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { Dialog, DialogContent } from './ui/dialog';
import { decodeEventLog, Log } from 'viem';

// Define gladiator names and addresses
const GLADIATOR_NAMES = [
  "Socrates",
  "Plato",
  "Aristotle",
  "Marcus Aurelius",
  "Seneca"
];

const GLADIATOR_ADDRESSES = [
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
  "0x4444444444444444444444444444444444444444",
  "0x5555555555555555555555555555555555555555"
] as const;

// Simple public keys for testing
const GLADIATOR_PUBLIC_KEYS = [
  "0x0001",
  "0x0002",
  "0x0003",
  "0x0004",
  "0x0005"
] as const;

// Market parameters
const DEFAULT_BONDING_TARGET = BigInt(1000) * BigInt(10**18); // 1000 tokens
const DEFAULT_BONDING_DURATION = 7 * 24 * 60 * 60; // 7 days
const DEFAULT_BASE_PRICE = 100; // $0.01 in basis points

export function CreateDebate() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('1');
  const [rounds, setRounds] = useState('3');
  const [judgeAI, setJudgeAI] = useState('');

  const { data: debateHash, writeContract: writeDebate, error: writeError, isPending: isDebatePending } = useWriteContract();

  const { 
    data: marketHash, 
    writeContract: writeMarket, 
    error: marketError,
    isPending: isMarketPending 
  } = useWriteContract();

  const { isLoading: isConfirmingDebate, isSuccess: isDebateSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: debateHash,
  });

  const { isLoading: isConfirmingMarket } = useWaitForTransactionReceipt({
    hash: marketHash,
  });

  // Log any errors
  useEffect(() => {
    if (writeError) {
      console.error('Debate creation error:', writeError);
    }
    if (marketError) {
      console.error('Market creation error:', marketError);
    }
  }, [writeError, marketError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    writeDebate({
      address: DEBATE_FACTORY_ADDRESS,
      abi: DEBATE_FACTORY_ABI,
      functionName: 'createDebate',
      args: [topic, BigInt(Number(duration) * 24 * 60 * 60), BigInt(rounds), [judgeAI]],
    });
  };

  // Create market when debate is created
  useEffect(() => {
    console.log('Effect triggered:', {
      isDebateSuccess,
      hasReceipt: !!receipt,
      hasLogs: !!receipt?.logs,
      judgeAI,
      writeMarket: !!writeMarket
    });

    if (isDebateSuccess && receipt?.logs && writeMarket) {
      try {
        // Find DebateCreated event
        const log = receipt.logs.find((log: Log) => {
          try {
            const event = decodeEventLog({
              abi: DEBATE_FACTORY_ABI,
              ...log,
            });
            console.log('Decoded log event:', event);
            return event.eventName === 'DebateCreated';
          } catch (error) {
            console.log('Error decoding log:', error);
            return false;
          }
        });

        if (!log) {
          console.log('DebateCreated event not found in logs');
          return;
        }

        const decodedEvent = decodeEventLog({
          abi: DEBATE_FACTORY_ABI,
          ...log,
        });
        console.log('Final decoded event:', decodedEvent);

        if (decodedEvent.eventName === 'DebateCreated' && 
            decodedEvent.args && 
            'debateId' in decodedEvent.args) {

          writeMarket({
            address: MARKET_FACTORY_ADDRESS,
            abi: MARKET_FACTORY_ABI,
            functionName: 'createMarket',
            args: [
              MOCK_TOKEN_ADDRESS as `0x${string}`,
              decodedEvent.args.debateId,
              GLADIATOR_ADDRESSES as unknown as `0x${string}`[],
              GLADIATOR_NAMES,
              GLADIATOR_PUBLIC_KEYS as unknown as `0x${string}`[],
              judgeAI as `0x${string}`,
              DEFAULT_BONDING_TARGET,
              DEFAULT_BONDING_DURATION,
              DEFAULT_BASE_PRICE
            ] as const
          });
        }
      } catch (error) {
        console.error('Error creating market:', error);
      }
    }
  }, [isDebateSuccess, receipt, writeMarket, judgeAI]);

  const isPending = isDebatePending || isMarketPending || isConfirmingDebate || isConfirmingMarket;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Create a New Debate</CardTitle>
          <CardDescription>Set up a new debate topic and define its parameters</CardDescription>
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
              <Label htmlFor="judgeAI">Judge AI Address</Label>
              <Input
                id="judgeAI"
                value={judgeAI}
                onChange={(e) => setJudgeAI(e.target.value)}
                placeholder="Enter Judge AI address"
                required
              />
            </div>
            {!isConnected ? (
              <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-md">
                Please connect your wallet to create a debate
              </div>
            ) : (
              <Button
                type="submit"
                disabled={isPending || !judgeAI}
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