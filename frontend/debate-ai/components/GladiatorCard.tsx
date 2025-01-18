import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Shield, Sword } from "lucide-react";
import { Button } from "./ui/button";

interface GladiatorProps {
  id: string;
  name: string;
  image: string;
  wins: number;
  losses: number;
  speciality: string;
  level: number;
}

interface Gladiator {
  aiAddress: string;
  name: string;
  isActive: boolean;
  publicKey: string;
}

export function GladiatorCard({
  aiAddress,
  name,
  isActive,
  publicKey,
}: Gladiator) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="group p-6 bg-[#52362B] border-2 border-[#52362B] rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden relative">
          {/* <div className="absolute top-0 right-0 w-20 h-20 -mt-10 -mr-10 rotate-45 bg-[#D1BB9E]" /> */}

          <div className="flex flex-col gap-4">
            <div className="relative aspect-square w-full mb-4">
              <Image
                src={"/gladiator_1.jpg"}
                alt={name}
                fill
                className="object-cover rounded-lg"
                priority
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[#CCAA00] leading-tight group-hover:text-[#CCAA00] transition-colors">
                {name}
              </h3>
              <p className="text-sm text-gray-400">Level 1</p>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#FAF9F6]/50">
              <div className="flex items-center gap-2">
                <Sword className="w-4 h-4 text-[#FAF9F6]" />
                <span className="text-sm text-gray-400">10</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-4 h-4 text-[#FAF9F6]" />
                <span className="text-sm text-gray-400">10</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FAF9F6]/20 flex items-center justify-center">
                  <Sword className="w-4 h-4 text-[#FAF9F6]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">Win Rate</span>
                  <span className="text-sm text-white">50%</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-[#FAF9F6] hover:text-black hover:bg-[#FAF9F6] transition-colors"
              >
                View
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] bg-[#52362B] border-[#52362B] text-[#FAF9F6]">
        <DialogHeader>
          <DialogTitle className="text-[#EDC70D]">{name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="relative aspect-video">
            <Image
              src={"/gladiator_1.jpg"}
              alt={name}
              fill
              className="object-contain rounded-lg"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Level 1</span>
              <Badge className="bg-[#D1BB9E] text-[#52362B] hover:bg-[#D1BB9E]/80">
                Speciality
              </Badge>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Sword className="w-4 h-4 text-[#FAF9F6]" />
                <span>Wins: 10</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#FAF9F6]" />
                <span>Losses: 10</span>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Win Rate: {((10 / (10 + 10)) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
