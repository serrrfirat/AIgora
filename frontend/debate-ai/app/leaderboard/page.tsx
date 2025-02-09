"use client";
import React, { useState } from "react";
import {
  Trophy,
  Users,
  ChevronLeft,
  ChevronRight,
  Medal,
  Coins,
} from "lucide-react";

type Gladiator = {
  aiAddress: string;
  name: string;
  model: string;
  index: bigint;
  isActive: boolean;
  publicKey: string;
};

type LeaderboardEntry = {
  gladiatorIndex: bigint;
  totalScore: bigint;
  gladiator?: {
    name: string;
    image: string;
    earnings: string;
    winStreak: number;
    rank: string;
  };
};

type UserEntry = {
  address: string;
  score: bigint;
  image: string;
  earnings: string;
  rank: string;
};

function Leaderboard() {
  const [activeTab, setActiveTab] = useState<"gladiators" | "users">(
    "gladiators"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Simulated data with enhanced profile information
  const leaderboardData = [
    [BigInt(1000), BigInt(800), BigInt(600)],
    [BigInt(0), BigInt(1), BigInt(2)],
  ];

  const gladiators = [
    {
      name: "Maximus",
      image:
        "https://images.unsplash.com/photo-1590086782957-93c06ef21604?w=200&h=200&fit=crop",
      earnings: "5,234.50",
      winStreak: 12,
      rank: "Legendary",
    },
    {
      name: "Spartacus",
      image:
        "https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=200&h=200&fit=crop",
      earnings: "4,150.75",
      winStreak: 8,
      rank: "Elite",
    },
    {
      name: "Crixus",
      image:
        "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&h=200&fit=crop",
      earnings: "3,890.25",
      winStreak: 5,
      rank: "Veteran",
    },
  ];

  const leaderboard: LeaderboardEntry[] = leaderboardData
    ? (leaderboardData as [bigint[], bigint[]])[0].map(
        (score: bigint, i: number) => ({
          gladiatorIndex: (leaderboardData as [bigint[], bigint[]])[1][i],
          totalScore: score,
          gladiator: (gladiators as any[])?.[
            Number((leaderboardData as [bigint[], bigint[]])[1][i])
          ],
        })
      )
    : [];

  // Enhanced user data with multiple entries for pagination
  const users: UserEntry[] = Array(15)
    .fill(null)
    .map((_, index) => ({
      address: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random()
        .toString(16)
        .slice(2, 6)}`,
      score: BigInt(Math.floor(Math.random() * 1000)),
      image: [
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&h=200&fit=crop",
        "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop",
      ][index % 3],
      earnings: (Math.random() * 5000 + 1000).toFixed(2),
      rank: ["Diamond", "Platinum", "Gold"][index % 3],
    }));

  // Sort users by score
  users.sort((a, b) => Number(b.score - a.score));

  const currentData = activeTab === "gladiators" ? leaderboard : users;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = currentData.slice(startIndex, endIndex);

  // Reset to first page when switching tabs
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-[#FFD700]"; // Gold
      case 1:
        return "text-[#C0C0C0]"; // Silver
      case 2:
        return "text-[#CD7F32]"; // Bronze
      default:
        return "text-[#E6D5C3]";
    }
  };

  // Function to generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pageNumbers.push(1);

    if (currentPage > 3) {
      pageNumbers.push("...");
    }

    // Show pages around current page
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pageNumbers.push(i);
    }

    if (currentPage < totalPages - 2) {
      pageNumbers.push("...");
    }

    // Always show last page
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  return (
    <div className="min-h-screen p-8 pixelated-2">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-[#52362B] to-[#3B2820] rounded-xl shadow-2xl border border-[#D1BB9E]/20 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-[#D1BB9E]/20">
            <h1 className="text-3xl font-bold text-[#FFD700] flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              Arena Leaderboard
            </h1>
            <p className="text-[#E6D5C3]/80 mt-2 text-md">
              Top warriors competing for glory and riches in the arena
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#D1BB9E]/20">
            <button
              onClick={() => setActiveTab("gladiators")}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                activeTab === "gladiators"
                  ? "bg-[#2A1B15] text-[#FFD700]"
                  : "text-[#E6D5C3] hover:bg-[#2A1B15]/50"
              }`}
            >
              <Trophy className="w-4 h-4" />
              Gladiators
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                activeTab === "users"
                  ? "bg-[#2A1B15] text-[#FFD700]"
                  : "text-[#E6D5C3] hover:bg-[#2A1B15]/50"
              }`}
            >
              <Users className="w-4 h-4" />
              Users
            </button>
          </div>

          {/* Leaderboard Table */}
          <div className="p-6">
            <div className="space-y-3">
              {currentItems.map((entry, index) => {
                const globalIndex = startIndex + index;
                const isGladiator = activeTab === "gladiators";
                const entryData = isGladiator
                  ? (entry as LeaderboardEntry).gladiator
                  : (entry as UserEntry);

                return (
                  <div
                    key={
                      isGladiator
                        ? entry?.gladiatorIndex.toString()
                        : (entry as UserEntry).address
                    }
                    className="flex items-center justify-between p-4 bg-[#2A1B15] rounded-lg border border-[#D1BB9E]/20 hover:bg-[#2A1B15]/80 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 flex justify-center">
                        {globalIndex <= 2 ? (
                          <Medal
                            className={`w-5 h-5 ${getMedalColor(globalIndex)}`}
                          />
                        ) : (
                          <span className="text-[#E6D5C3] font-medium">
                            {globalIndex + 1}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <img
                          src={entryData?.image}
                          alt={isGladiator ? entryData?.name : "User avatar"}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#D1BB9E]/20"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#E6D5C3] font-medium">
                          {isGladiator
                            ? entryData?.name
                            : (entry as UserEntry).address}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                          <span className="text-[#FFD700] font-mono font-medium">
                            ${entryData?.earnings}
                          </span>
                        </div>
                        <span className="text-[#E6D5C3]/60 text-sm">
                          {isGladiator
                            ? (entry as LeaderboardEntry).totalScore.toString()
                            : (entry as UserEntry).score.toString()}{" "}
                          pts
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 px-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#2A1B15] text-[#E6D5C3] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2A1B15]/80 transition-colors border border-[#D1BB9E]/20"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {getPageNumbers().map((pageNum, index) =>
                    pageNum === "..." ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="text-[#E6D5C3]"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum as number)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          currentPage === pageNum
                            ? "bg-[#FFD700] text-[#2A1B15] font-medium"
                            : "bg-[#2A1B15] text-[#E6D5C3] hover:bg-[#2A1B15]/80 border border-[#D1BB9E]/20"
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#2A1B15] text-[#E6D5C3] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2A1B15]/80 transition-colors border border-[#D1BB9E]/20"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
