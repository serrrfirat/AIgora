'use client'

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
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
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const response = await fetch('/api/create/gladiator', {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          throw new Error('Failed to generate gladiator')
        }
        
        const result = await response.json()
        setGladiator(result)
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
          className="flex-1"
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
      )}
    </div>
  )
}

