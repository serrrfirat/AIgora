'use client'

import { useState, useEffect } from 'react'
import { useChat } from 'ai/react'
import { ethers } from 'ethers'
import { Card } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'

const AI_AGENTS = ['Agent 1', 'Agent 2', 'Agent 3']

export default function DebateRoom({ params }: { params: { id: string } }) {
  const [selectedAgent, setSelectedAgent] = useState('')
  const [bettingAmount, setBettingAmount] = useState('')
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'confirming' | 'processing' | 'completed'>('idle')
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null)

  const { messages } = useChat({
    api: '/api/chat',
    initialMessages: [{ id: '1', role: 'system', content: 'You are an AI agent participating in a debate.' }],
  })

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      setProvider(provider)
    }
  }, [])

  const handleBetting = async () => {
    if (!provider || !bettingAmount || !selectedAgent) return

    try {
      setTransactionStatus('confirming')
      const signer = provider.getSigner()
      
      setTransactionStatus('processing')
      const tx = await signer.sendTransaction({
        to: "0x0000000000000000000000000000000000000000",
        value: ethers.utils.parseEther(bettingAmount)
      })
      
      await tx.wait()
      setTransactionStatus('completed')
      
      setTimeout(() => {
        setBettingAmount('')
        setSelectedAgent('')
        setTransactionStatus('idle')
      }, 2000)
    } catch (error) {
      console.error("Failed to place bet:", error)
      setTransactionStatus('idle')
    }
  }

  if (transactionStatus !== 'idle') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-amber-500 to-amber-600 blur-xl opacity-50 animate-pulse" />
          <Card className="relative bg-zinc-900 text-white p-8 rounded-3xl flex flex-col items-center gap-6 min-w-[400px]">
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <div className="text-center">
              <p className="text-zinc-400 mb-2">You're betting</p>
              <p className="text-4xl font-mono mb-2">{bettingAmount} ETH</p>
              <p className="text-zinc-400">on <span className="text-white">{selectedAgent}</span></p>
            </div>
            <div className="w-full space-y-4">
              <div className={`flex items-center gap-3 ${transactionStatus === 'confirming' ? 'text-white' : 'text-zinc-600'}`}>
                {transactionStatus === 'confirming' ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="h-5 w-5 rounded-full border border-zinc-600" />}
                Confirm the transaction in your wallet
              </div>
              <div className={`flex items-center gap-3 ${transactionStatus === 'processing' ? 'text-white' : 'text-zinc-600'}`}>
                {transactionStatus === 'processing' ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="h-5 w-5 rounded-full border border-zinc-600" />}
                Processing your transaction
              </div>
              <div className={`flex items-center gap-3 ${transactionStatus === 'completed' ? 'text-white' : 'text-zinc-600'}`}>
                {transactionStatus === 'completed' ? '✓' : <div className="h-5 w-5 rounded-full border border-zinc-600" />}
                Successfully placed bet
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 bg-zinc-900 text-white border-zinc-800">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Debate</h2>
            <div className="space-y-4">
              {messages.map((m) => (
                <div key={m.id} className="bg-zinc-800 p-4 rounded-lg">
                  {m.content}
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="bg-zinc-900 text-white border-zinc-800">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Place Bet</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Amount (ETH)</label>
                <input
                  type="number"
                  value={bettingAmount}
                  onChange={(e) => setBettingAmount(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Select Agent</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Select an agent</option>
                  {AI_AGENTS.map((agent) => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleBetting}
                disabled={!bettingAmount || !selectedAgent}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-600 hover:to-amber-700 transition-colors"
              >
                Place Bet
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

