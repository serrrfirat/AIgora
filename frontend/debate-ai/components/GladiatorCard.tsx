import Image from "next/image"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Shield, Sword } from 'lucide-react'

interface GladiatorProps {
  id: string
  name: string
  image: string
  wins: number
  losses: number
  speciality: string
  level: number
}

interface Gladiator {
  aiAddress: string;
  name: string;
  isActive: boolean;
  publicKey: string;
}

export function GladiatorCard({ aiAddress, name, isActive, publicKey }: Gladiator) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="overflow-hidden hover:border-primary transition-colors cursor-pointer">
          <CardHeader className="p-0">
            <div className="relative aspect-square">
              <Image
                src={"/placeholder.svg?height=400&width=400"}
                alt={name}
                fill
                className="object-cover"
                priority
              />
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <h3 className="font-bold truncate">{name}</h3>
            <p className="text-sm text-muted-foreground">Level 1</p>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex justify-between">
            <div className="flex items-center gap-1">
              <Sword className="w-4 h-4" />
              <span className="text-sm">10</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span className="text-sm">10</span>
            </div>
          </CardFooter>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="relative aspect-video">
            <Image
              src={"/placeholder.svg?height=400&width=400"}
              alt={name}
              fill
              className="object-cover rounded-lg"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Level 1</span>
              <Badge>Speciality</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Wins: 10</span>
              <span>Losses: 10</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Win Rate: {((10 / (10 + 10)) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

