import { useState } from 'react';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { DebateFactoryContract, DebateConfig } from '../lib/contracts';

export function CreateDebate() {
  const { address } = useAccount();
  const [topic, setTopic] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [duration, setDuration] = useState('86400'); // 1 day in seconds
  const [bondingTarget, setBondingTarget] = useState('1000');
  const [bondingDuration, setBondingDuration] = useState('3600'); // 1 hour in seconds
  const [basePrice, setBasePrice] = useState('0.1');
  const [totalRounds, setTotalRounds] = useState('5');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    try {
      setIsLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const factory = new DebateFactoryContract(provider);

      const config: DebateConfig = {
        bondingTarget: ethers.utils.parseEther(bondingTarget),
        bondingDuration: parseInt(bondingDuration),
        basePrice: ethers.utils.parseEther(basePrice),
        minimumDuration: parseInt(duration)
      };

      const debateAddress = await factory.createDebate(
        topic,
        parseInt(duration),
        tokenAddress,
        config
      );

      console.log('Debate created at:', debateAddress);
      // You can add a success notification here
    } catch (error) {
      console.error('Error creating debate:', error);
      // You can add an error notification here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Create New Debate</h2>
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
          <Label htmlFor="tokenAddress">Token Address</Label>
          <Input
            id="tokenAddress"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="Enter ERC20 token address"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="duration">Duration (seconds)</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="3600"
              required
            />
          </div>

          <div>
            <Label htmlFor="totalRounds">Total Rounds</Label>
            <Input
              id="totalRounds"
              type="number"
              value={totalRounds}
              onChange={(e) => setTotalRounds(e.target.value)}
              min="1"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bondingTarget">Bonding Target</Label>
            <Input
              id="bondingTarget"
              type="number"
              value={bondingTarget}
              onChange={(e) => setBondingTarget(e.target.value)}
              min="0"
              step="0.1"
              required
            />
          </div>

          <div>
            <Label htmlFor="bondingDuration">Bonding Duration (seconds)</Label>
            <Input
              id="bondingDuration"
              type="number"
              value={bondingDuration}
              onChange={(e) => setBondingDuration(e.target.value)}
              min="300"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="basePrice">Base Price</Label>
          <Input
            id="basePrice"
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            min="0"
            step="0.01"
            required
          />
        </div>

        <Button type="submit" disabled={isLoading || !address} className="w-full">
          {isLoading ? 'Creating...' : 'Create Debate'}
        </Button>
      </form>
    </Card>
  );
} 