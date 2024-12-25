'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { DebateFactoryContract, DebateContract, DebateInfo } from '../lib/contracts';

interface DebatePreview extends DebateInfo {
  address: string;
}

export function DebateList() {
  const { address } = useAccount();
  const [debates, setDebates] = useState<DebatePreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDebates = async () => {
      if (!address) return;

      try {
        const provider = new ethers.BrowserProvider();
        const factory = new DebateFactoryContract(provider);
        const debateAddresses = await factory.getAllDebates();

        const debateInfos = await Promise.all(
          debateAddresses.map(async (debateAddress) => {
            const debate = new DebateContract(debateAddress, provider);
            const info = await debate.getDebateInfo();
            return {
              ...info,
              address: debateAddress,
            };
          })
        );

        // Filter out inactive debates and sort by most recent
        const activeDebates = debateInfos
          .filter((debate) => debate.isActive)
          .sort((a, b) => b.debateEndTime - a.debateEndTime);

        setDebates(activeDebates);
      } catch (error) {
        console.error('Error loading debates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDebates();
  }, [address]);

  if (isLoading) return <div>Loading debates...</div>;
  if (!address) return <div>Please connect your wallet to view debates</div>;
  if (debates.length === 0) return <div>No active debates found</div>;

  return (
    <div className="grid gap-4">
      {debates.map((debate) => (
        <DebateCard key={debate.address} debate={debate} />
      ))}
    </div>
  );
}

interface DebateCardProps {
  debate: DebatePreview;
}

function DebateCard({ debate }: DebateCardProps) {
  const timeLeft = debate.debateEndTime * 1000 - Date.now();
  const isActive = debate.isActive && timeLeft > 0;

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return 'Ended';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatAddress = (address: string) => 
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-semibold">{debate.topic}</h3>
          <p className="text-sm text-gray-500">
            Created by: {formatAddress(debate.creator)}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm ${isActive ? 'text-green-500' : 'text-red-500'}`}>
            {isActive ? 'Active' : 'Ended'}
          </p>
          <p className="text-sm text-gray-500">
            {formatTimeLeft(timeLeft)}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="text-sm">
          <p>Round: {debate.currentRound} / {debate.totalRounds}</p>
          <p>
            Bonding: {ethers.formatEther(debate.bondingCurve.current)}/
            {ethers.formatEther(debate.bondingCurve.target)} tokens
          </p>
        </div>
        <Link href={`/debate/${debate.address}`} passHref>
          <Button variant="outline">View Debate</Button>
        </Link>
      </div>
    </Card>
  );
} 