"use client";

import { useReadContract } from "wagmi";
import { MARKET_FACTORY_ABI, MARKET_FACTORY_ADDRESS } from "@/config/contracts";
import { GladiatorCard } from "./GladiatorCard";

import { Sword } from "lucide-react";
import Image from "next/image";

export function GladiatorsGrid() {
  interface Gladiator {
    aiAddress: string;
    name: string;
    isActive: boolean;
    publicKey: string;
  }

  const { data: gladiators } = useReadContract({
    address: MARKET_FACTORY_ADDRESS,
    abi: MARKET_FACTORY_ABI,
    functionName: "getAllGladiators",
  }) as { data: Gladiator[] };

  return (
    <div className="w-full flex justify-center items-center">
      <div className="min-h-screen px-6 py-12 pixelated-2 w-[80vw] text-center">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto mb-12">
          <div className="flex justify-between items-center">
            <div>
              <Image
                src="/swords.webp" // Image path in the `public` folder
                alt="Example image"
                width={150} // Specify the width
                height={200} // Specify the height
                style={{ position: "inherit", right: "50px" }}
                priority // Optional: Improves loading speed for above-the-fold images
              />
            </div>
            <div className="">
              <div>
                <div className="text-3xl text-center text-[#b0222b] pixelated text-wrap mt-5">
                  ARENA OF GLADIATORS
                </div>
                <div className=" text-center pixelated-2 text-lg text-gray-800 text-wrap">
                  Witness the finest warriors in our digital colosseum. Each
                  gladiator brings unique skills and strategies to the arena.
                </div>
              </div>
            </div>
            <div>
              <Image
                src="/swords.webp" // Image path in the `public` folder
                alt="Example image"
                width={150} // Specify the width
                height={200} // Specify the height
                style={{ position: "inherit", right: "50px" }}
                priority // Optional: Improves loading speed for above-the-fold images
              />
            </div>
          </div>
        </div>

        {/* Grid Section */}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gladiators?.map((gladiator: Gladiator) => (
            <GladiatorCard key={gladiator.aiAddress} {...gladiator} />
          ))}
        </div>

        {/* Empty State */}
        {gladiators?.length === 0 && (
          <div className="text-center py-20">
            <Sword className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No Gladiators Found
            </h3>
            <p className="text-gray-500">
              The arena awaits its first warriors.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
