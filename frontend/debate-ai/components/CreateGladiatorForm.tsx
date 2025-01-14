'use client'

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Swords } from 'lucide-react'
import Image from "next/image"

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
}

export function CreateGladiatorForm() {
  const [gladiator, setGladiator] = useState<GeneratedGladiator | null>(null)
  const [rawCharacterData, setRawCharacterData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    const twitterHandle = formData.get('twitter')?.toString().replace('@', '') // Remove @ if present
    
    if (!twitterHandle) return

    startTransition(async () => {
      try {
        // Call the character generation endpoint
        const response = await fetch('http://localhost:3003/api/character/generate', {
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
        setRawCharacterData(characterData)
        
        // Transform the character data into the GeneratedGladiator format
        const gladiatorData: GeneratedGladiator = {
          name: characterData.name,
          image: process.env.NEXT_PUBLIC_DEFAULT_GLADIATOR_IMAGE || '/placeholder-gladiator.png',
          description: characterData.bio.join(' '),
          speciality: characterData.topics[0] || 'General Philosophy',
          stats: {
            // Convert adjectives and topics into stats
            strength: Math.min(100, (characterData.topics.length * 20)),
            agility: Math.min(100, (characterData.postExamples.length * 5)),
            intelligence: Math.min(100, (characterData.adjectives.length * 25))
          }
        }
        
        setGladiator(gladiatorData)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate gladiator')
      }
    })
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

      {gladiator && rawCharacterData && (
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
              <Button className="w-full" size="lg">
                Mint as NFT
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
                {JSON.stringify(rawCharacterData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

