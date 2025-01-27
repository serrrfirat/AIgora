'use client'

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Swords } from 'lucide-react'
import Image from "next/image"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { GLADIATOR_NFT_ADDRESS, GLADIATOR_NFT_ABI } from '@/config/contracts'
import { MARKET_FACTORY_ADDRESS, MARKET_FACTORY_ABI } from '@/config/contracts'

interface GeneratedGladiator {
  name: string
  image: string
  description: string
  speciality: string
  stats: {
    strength: number
    agility: number
    intelligence: number
  }
  ipfsUrl?: string
}

export function CreateGladiatorForm() {
  const [gladiator, setGladiator] = useState<GeneratedGladiator | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showMintingModal, setShowMintingModal] = useState(false)
  const [mintError, setMintError] = useState<string | null>(null)

  // Wagmi hooks for minting
  const { address, isConnected } = useAccount()
  const { writeContract, isPending: isMintPending, data: txHash } = useWriteContract()
  const { isLoading: isMintConfirming, isSuccess: isMintSuccess, error: mintTxError } = useWaitForTransactionReceipt({
    hash: txHash,
  })
  const coordinatorUrl = process.env.NEXT_PUBLIC_COORDINATOR_URL;
  async function handleSubmit(formData: FormData) {
    const twitterHandle = formData.get('twitter')?.toString().replace('@', '') // Remove @ if present
    
    if (!twitterHandle) return

    startTransition(async () => {
      try {
        // Call the character generation endpoint
        const response = await fetch(`${coordinatorUrl}/api/character/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: twitterHandle }),
        })
        
        if (!response.ok) {
          throw new Error('Failed to generate gladiator')
        }
        
        const characterData = await response.json()

        // Add validation
        if (!characterData?.data?.name) {
          throw new Error('Invalid character data structure');
        }

        // Transform the character data into the GeneratedGladiator format
        const gladiatorData: GeneratedGladiator = {
          name: characterData.data.name || 'Unknown Gladiator',
          image: process.env.NEXT_PUBLIC_DEFAULT_GLADIATOR_IMAGE || '/placeholder-gladiator.png',
          description: characterData.data.bio?.join(' ') || 'No description available',
          speciality: characterData.data.topics?.[0] || 'General Philosophy',
          stats: {
            strength: Math.min(100, (characterData.data.topics?.length || 0) * 20),
            agility: Math.min(100, (characterData.data.postExamples?.length || 0) * 5),
            intelligence: Math.min(100, (characterData.data.adjectives?.length || 0) * 25)
          },
          ipfsUrl: characterData.data.ipfsUrl
        }
        
        setGladiator(gladiatorData)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate gladiator')
      }
    })
  }

  const handleMint = async () => {
    if (!gladiator || !address || !isConnected) return;

    try {
      setShowMintingModal(true)
      setMintError(null)

      const publicKey = Math.floor(Math.random() * 1000000).toString(16);
      await writeContract({
        address: MARKET_FACTORY_ADDRESS,
        abi: MARKET_FACTORY_ABI,
        functionName: 'registerGladiator',
        args: [
          gladiator.name,
          gladiator.ipfsUrl || '', // Use IPFS URL instead of raw data
          publicKey
        ],
      })
    } catch (e) {
      setMintError(e instanceof Error ? e.message : 'Failed to mint NFT')
    }
  }

  return (
    <div className="grid gap-6">
      <form action={handleSubmit} className="flex gap-4">
        <Input
          name="twitter"
          placeholder="Enter Twitter handle (e.g. @example)"
          className="flex-1 text-white placeholder:text-gray-400"
          required
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Swords className="mr-2 h-4 w-4" />
              Generate Gladiator
            </>
          )}
        </Button>
      </form>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {gladiator && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Formatted Gladiator Card */}
          <Card className="overflow-hidden">
            <div className="relative aspect-square">
              <Image
                src={gladiator.image}
                alt={gladiator.name}
                fill
                className="object-cover"
                priority
              />
            </div>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-2">{gladiator.name}</h2>
              <p className="text-muted-foreground mb-4">{gladiator.description}</p>
              <div className="grid gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Speciality</h3>
                  <p>{gladiator.speciality}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Stats</h3>
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <span>Strength</span>
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ width: `${gladiator.stats.strength}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span>Agility</span>
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ width: `${gladiator.stats.agility}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span>Intelligence</span>
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ width: `${gladiator.stats.intelligence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-6 pt-0">
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleMint}
                disabled={!isConnected || isMintPending || isMintConfirming}
              >
                {isMintPending || isMintConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Minting...
                  </>
                ) : !isConnected ? (
                  'Connect Wallet to Mint'
                ) : (
                  'Mint as NFT'
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Raw JSON Data Card */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Raw Character Data</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px] text-sm">
                {JSON.stringify(gladiator, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

