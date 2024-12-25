'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DebateContract, DebateInfo, RoundInfo, BetInfo } from '../lib/contracts';

interface DebateViewProps {
  debateAddress: string;
}

export function DebateView({ debateAddress }: DebateViewProps) {
  const { address } = useAccount();
  const [debate, setDebate] = useState<DebateContract | null>(null);
  const [debateInfo, setDebateInfo] = useState<DebateInfo | null>(null);
  const [currentRoundInfo, setCurrentRoundInfo] = useState<RoundInfo | null>(null);
  const [userBet, setUserBet] = useState<BetInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Betting form state
  const [betAmount, setBetAmount] = useState('');
  const [prediction, setPrediction] = useState<boolean>(true);
  const [evidence, setEvidence] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');

  // Judge scoring state
  const [score, setScore] = useState('5');

  useEffect(() => {
    const init = async () => {
      if (!address) return;

      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const debateContract = new DebateContract(debateAddress, provider);
        setDebate(debateContract);

        const info = await debateContract.getDebateInfo();
        setDebateInfo(info);

        const roundInfo = await debateContract.getRoundInfo(info.currentRound);
        setCurrentRoundInfo(roundInfo);

        if (address) {
          const bet = await debateContract.getBetInfo(address);
          setUserBet(bet);
        }
      } catch (error) {
        console.error('Error initializing debate view:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [debateAddress, address]);

  const handlePlaceBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debate || !address) return;

    try {
      setIsLoading(true);
      await debate.placeBet(
        ethers.utils.parseEther(betAmount),
        prediction,
        evidence,
        twitterHandle
      );
      const bet = await debate.getBetInfo(address);
      setUserBet(bet);
    } catch (error) {
      console.error('Error placing bet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debate || !debateInfo) return;

    try {
      setIsLoading(true);
      await debate.scoreRound(debateInfo.currentRound, parseInt(score));
      const roundInfo = await debate.getRoundInfo(debateInfo.currentRound);
      setCurrentRoundInfo(roundInfo);
    } catch (error) {
      console.error('Error scoring round:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!debateInfo) return <div>Debate not found</div>;

  const timeLeft = debateInfo.debateEndTime * 1000 - Date.now();
  const isActive = debateInfo.isActive && timeLeft > 0;

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{debateInfo.topic}</h2>
        <p className="text-sm text-gray-500">
          Created by: {debateInfo.creator}
        </p>
        <div className="mt-2">
          <p>Round: {debateInfo.currentRound} / {debateInfo.totalRounds}</p>
          <p>Status: {isActive ? 'Active' : 'Ended'}</p>
          <p>Time Left: {Math.max(0, Math.floor(timeLeft / 1000))}s</p>
        </div>
      </div>

      <Tabs defaultValue="bet" className="w-full">
        <TabsList>
          <TabsTrigger value="bet">Place Bet</TabsTrigger>
          <TabsTrigger value="judge">Judge Round</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="bet">
          {userBet?.amount.gt(0) ? (
            <div className="space-y-2">
              <h3 className="font-semibold">Your Bet</h3>
              <p>Amount: {ethers.utils.formatEther(userBet.amount)} tokens</p>
              <p>Prediction: {userBet.prediction ? 'For' : 'Against'}</p>
              <p>Early Better: {userBet.isEarlyBetter ? 'Yes' : 'No'}</p>
              <p>Evidence: {userBet.evidence}</p>
              <p>Twitter: {userBet.twitterHandle}</p>
            </div>
          ) : (
            <form onSubmit={handlePlaceBet} className="space-y-4">
              <div>
                <Label htmlFor="betAmount">Bet Amount</Label>
                <Input
                  id="betAmount"
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <Label>Prediction</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={prediction ? 'default' : 'outline'}
                    onClick={() => setPrediction(true)}
                  >
                    For
                  </Button>
                  <Button
                    type="button"
                    variant={!prediction ? 'default' : 'outline'}
                    onClick={() => setPrediction(false)}
                  >
                    Against
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="evidence">Evidence</Label>
                <Input
                  id="evidence"
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="Provide evidence for your prediction"
                  required
                />
              </div>

              <div>
                <Label htmlFor="twitter">Twitter Handle</Label>
                <Input
                  id="twitter"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value)}
                  placeholder="@username"
                />
              </div>

              <Button type="submit" disabled={!isActive || isLoading} className="w-full">
                {isLoading ? 'Placing Bet...' : 'Place Bet'}
              </Button>
            </form>
          )}
        </TabsContent>

        <TabsContent value="judge">
          {currentRoundInfo && (
            <form onSubmit={handleScoreRound} className="space-y-4">
              <div>
                <Label htmlFor="score">Score (1-10)</Label>
                <Input
                  id="score"
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  min="1"
                  max="10"
                  required
                />
              </div>

              <Button 
                type="submit" 
                disabled={
                  !isActive || 
                  isLoading || 
                  currentRoundInfo.isComplete || 
                  currentRoundInfo.judgeCount >= 3
                }
                className="w-full"
              >
                {isLoading ? 'Submitting Score...' : 'Submit Score'}
              </Button>

              {currentRoundInfo.isComplete && (
                <p className="text-yellow-600">This round is complete</p>
              )}
            </form>
          )}
        </TabsContent>

        <TabsContent value="info">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Bonding Curve</h3>
              <p>Target: {ethers.utils.formatEther(debateInfo.bondingCurve.target)} tokens</p>
              <p>Current: {ethers.utils.formatEther(debateInfo.bondingCurve.current)} tokens</p>
              <p>Current Price: {ethers.utils.formatEther(debateInfo.bondingCurve.currentPrice)} tokens</p>
              <p>Status: {debateInfo.bondingCurve.isFulfilled ? 'Fulfilled' : 'In Progress'}</p>
            </div>

            {currentRoundInfo && (
              <div>
                <h3 className="font-semibold">Current Round</h3>
                <p>Judge Count: {currentRoundInfo.judgeCount} / 3</p>
                <p>Total Score: {currentRoundInfo.totalScore}</p>
                <p>Start Time: {new Date(currentRoundInfo.startTime * 1000).toLocaleString()}</p>
                <p>End Time: {new Date(currentRoundInfo.endTime * 1000).toLocaleString()}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
} 