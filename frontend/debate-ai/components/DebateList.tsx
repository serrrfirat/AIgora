// import { useReadContract, useReadContracts } from "wagmi";
// import {
//   DEBATE_FACTORY_ADDRESS,
//   DEBATE_FACTORY_ABI,
//   MARKET_FACTORY_ADDRESS,
//   MARKET_FACTORY_ABI,
// } from "@/config/contracts";
// import { Card } from "./ui/card";
// import { formatAddress } from "@/lib/utils";
// import { Button } from "./ui/button";
// import { ChatWindow } from "./MiniChatWindow";
// import { type Abi } from "viem";
// import { Badge } from "./ui/badge";
// import {
//   Award,
//   ChevronRight,
//   Clock,
//   MessagesSquare,
//   Plus,
//   Users,
// } from "lucide-react";

// type DebateDetails = [
//   string, // topic
//   bigint, // startTime
//   bigint, // duration
//   bigint, // debateEndTime
//   bigint, // currentRound
//   bigint, // totalRounds
//   boolean, // isActive
//   string, // creator
//   string, // market
//   string[], // judges
//   boolean, // hasOutcome
//   bigint // finalOutcome
// ];

// interface DebateWithId {
//   id: bigint;
//   details: DebateDetails;
//   marketId: bigint;
// }

// function sortDebatesByStartTime(debates: DebateWithId[]): DebateWithId[] {
//   return [...debates].sort((a, b) => {
//     const timeA = Number(a.details[1]); // startTime
//     const timeB = Number(b.details[1]); // startTime
//     return timeB - timeA; // Sort in descending order (newest first)
//   });
// }

// export function DebateList() {
//   // Get all debate IDs
//   const { data: debateIds } = useReadContract({
//     address: DEBATE_FACTORY_ADDRESS,
//     abi: DEBATE_FACTORY_ABI as unknown as Abi,
//     functionName: "getAllDebates",
//   }) as { data: bigint[] | undefined };

//   // Get debate details for each ID
//   const { data: debateDetails } = useReadContracts({
//     contracts: (debateIds || []).map((id) => ({
//       address: DEBATE_FACTORY_ADDRESS,
//       abi: DEBATE_FACTORY_ABI as unknown as Abi,
//       functionName: "getDebateDetails",
//       args: [id],
//     })),
//   });

//   // Get market ID for each debate ID
//   const { data: marketIdsData } = useReadContracts({
//     contracts: (debateIds || []).map((id) => ({
//       address: MARKET_FACTORY_ADDRESS,
//       abi: MARKET_FACTORY_ABI as unknown as Abi,
//       functionName: "debateIdToMarketId",
//       args: [id],
//     })),
//   });

//   const handleDebateClick = (debateId: string) => {
//     window.location.href = `/debate/${debateId}`;
//   };

//   // Combine all data and sort
//   const debates: DebateWithId[] = [];
//   debateIds?.forEach((id, index) => {
//     const details = debateDetails?.[index]?.result as DebateDetails | undefined;
//     const marketId = marketIdsData?.[index]?.result as bigint | undefined;

//     if (details && marketId) {
//       debates.push({ id, details, marketId });
//     }
//   });

//   const sortedDebates = sortDebatesByStartTime(debates);

//   return (
//     <div className="space-y-8 p-4 w-full flex flex-col items-center pixelated-2">
//       <div className="grid w-[80vw] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//         {sortedDebates.map(({ id: debateId, details, marketId }) => {
//           // const details = debateDetails?.[index]?.result as
//           //   | DebateDetails
//           //   | undefined;
//           if (!details) return null;

//           const [
//             topic,
//             currentRound,
//             totalRounds,
//             isActive,
//             creator,
//             judges,
//             hasOutcome,
//             finalOutcome,
//           ] = details;

//           return (
//             <Card
//               key={debateId.toString()}
//               className="group p-6 bg-[#52362B] border-2 border-[#52362B] rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden relative"
//               // onClick={() => handleDebateClick(debateId.toString())}
//             >
//               {/* Status Indicator */}
//               <div
//                 className={`absolute top-0 right-0 w-20 h-20 -mt-10 -mr-10 rotate-45 ${
//                   isActive ? "bg-[#D1BB9E]" : "bg-red-500/20"
//                 }`}
//               />

//               <div className="flex flex-col gap-4">
//                 {/* Topic Section */}
//                 <div className="space-y-2">
//                   <div className="flex items-center gap-2 text-[#FAF9F6] mb-2">
//                     {/* <MessageCircle className="w-4 h-4" /> */}
//                     {/* <span className="text-xs uppercase tracking-wider">
//                       Debate Topic
//                     </span> */}
//                   </div>
//                   <h3 className="text-xl font-bold text-[#CCAA00] leading-tight group-hover:text-[#CCAA00] transition-colors">
//                     {topic}
//                   </h3>
//                 </div>

//                 {/* Stats Grid */}
//                 <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#FAF9F6]/50">
//                   <div className="flex items-center gap-2">
//                     <MessagesSquare className="w-4 h-4 text-[#FAF9F6]" />
//                     <span className="text-sm text-gray-400">0 Messages</span>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     {/* <Activity className="w-4 h-4 text-[#FAF9F6]" /> */}
//                     <div className="flex items-center gap-2">
//                       {isActive && (
//                         <div className="w-2 h-2 rounded-full bg-green-500 status-dot animate-blink" />
//                       )}
//                       <span
//                         className={`text-sm ${
//                           isActive ? "text-green-400" : "text-red-400"
//                         }`}
//                       >
//                         {isActive ? "Active" : "Completed"}
//                       </span>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <Clock className="w-4 h-4 text-[#FAF9F6]" />
//                     <span className="text-sm text-gray-400">
//                       {currentRound.toString()}/{totalRounds.toString()} Rounds
//                     </span>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <Users className="w-4 h-4 text-[#FAF9F6]" />
//                     <span className="text-sm text-gray-400">
//                       {judges} Judges
//                     </span>
//                   </div>
//                 </div>

//                 <div className="h-[300px] border-t border-gray-800">
//                   <ChatWindow marketId={marketId} />
//                 </div>

//                 {/* Footer */}
//                 <div className="flex justify-between items-center">
//                   <div className="flex items-center gap-2">
//                     <div className="w-8 h-8 rounded-full bg-[#FAF9F6]/20 flex items-center justify-center">
//                       <Award className="w-4 h-4 text-[#FAF9F6]" />
//                     </div>
//                     <div className="flex flex-col">
//                       <span className="text-xs text-gray-400">Created by</span>
//                       <span className="text-sm text-white">
//                         {formatAddress(creator.toString())}
//                       </span>
//                     </div>
//                   </div>
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     className="text-[#FAF9F6] hover:text-black hover:bg-[#FAF9F6] transition-colors"
//                     onClick={() => handleDebateClick(debateId.toString())}
//                   >
//                     View
//                     <ChevronRight className="w-4 h-4 ml-1" />
//                   </Button>
//                 </div>

//                 {/* Outcome Badge */}
//                 {/* {hasOutcome && (
//                   <div className="absolute top-4 right-4 px-2 py-1 bg-[#FAF9F6]/10 rounded-full border border-[#FAF9F6]/20">
//                     <span className="text-xs text-[#FAF9F6]">
//                       Outcome: {finalOutcome.toString()}
//                     </span>
//                   </div>
//                 )} */}
//               </div>
//             </Card>
//           );
//         })}
//       </div>

//       {/* Load More Button */}
//       {/* {hasMore && (
//         <div className="flex justify-center pt-4">
//           <Button
//             onClick={handleLoadMore}
//             variant="outline"
//             className="border-[#52362B] font-semibold text-[#52362B] pixelated-2 hover:bg-[#52362B] hover:text-white transition-colors gap-2"
//           >
//             <Plus className="w-4 h-4 pixelated-2" />
//             Load More Debates
//           </Button>
//         </div>
//       )} */}
//     </div>
//   );
// }

import { useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import {
  DEBATE_FACTORY_ADDRESS,
  DEBATE_FACTORY_ABI,
  MARKET_FACTORY_ADDRESS,
  MARKET_FACTORY_ABI,
} from "@/config/contracts";
import { Card } from "./ui/card";
import { formatAddress } from "@/lib/utils";
import { Button } from "./ui/button";
import { ChatWindow } from "./MiniChatWindow";
import { type Abi } from "viem";
import {
  Award,
  ChevronRight,
  Clock,
  MessagesSquare,
  Plus,
  Users,
} from "lucide-react";

type DebateDetails = [
  string, // topic
  bigint, // startTime
  bigint, // duration
  bigint, // debateEndTime
  bigint, // currentRound
  bigint, // totalRounds
  boolean, // isActive
  string, // creator
  string, // market
  string[], // judges
  boolean, // hasOutcome
  bigint // finalOutcome
];

interface DebateWithId {
  id: bigint;
  details: DebateDetails;
  marketId: bigint;
}

function sortDebatesByStartTime(debates: DebateWithId[]): DebateWithId[] {
  return [...debates].sort((a, b) => {
    const timeA = Number(a.details[1]); // startTime
    const timeB = Number(b.details[1]); // startTime
    return timeB - timeA; // Sort in descending order (newest first)
  });
}

export function DebateList() {
  const [visibleItems, setVisibleItems] = useState(6);

  // Get all debate IDs
  const { data: debateIds } = useReadContract({
    address: DEBATE_FACTORY_ADDRESS,
    abi: DEBATE_FACTORY_ABI as unknown as Abi,
    functionName: "getAllDebates",
  }) as { data: bigint[] | undefined };

  // Get debate details for each ID
  const { data: debateDetails } = useReadContracts({
    contracts: (debateIds || []).map((id) => ({
      address: DEBATE_FACTORY_ADDRESS,
      abi: DEBATE_FACTORY_ABI as unknown as Abi,
      functionName: "getDebateDetails",
      args: [id],
    })),
  });

  // Get market ID for each debate ID
  const { data: marketIdsData } = useReadContracts({
    contracts: (debateIds || []).map((id) => ({
      address: MARKET_FACTORY_ADDRESS,
      abi: MARKET_FACTORY_ABI as unknown as Abi,
      functionName: "debateIdToMarketId",
      args: [id],
    })),
  });

  const handleDebateClick = (debateId: string) => {
    window.location.href = `/debate/${debateId}`;
  };

  // Combine all data and sort
  const debates: DebateWithId[] = [];
  debateIds?.forEach((id, index) => {
    const details = debateDetails?.[index]?.result as DebateDetails | undefined;
    const marketId = marketIdsData?.[index]?.result as bigint | undefined;

    if (details && marketId) {
      debates.push({ id, details, marketId });
    }
  });

  const sortedDebates = sortDebatesByStartTime(debates);
  const visibleDebates = sortedDebates.slice(0, visibleItems);
  const hasMore = visibleItems < sortedDebates.length;

  const handleLoadMore = () => {
    setVisibleItems((prev) => prev + 6);
  };

  return (
    <div className="space-y-8 p-4 w-full flex flex-col items-center pixelated-2">
      <div className="grid w-[80vw] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleDebates.map(({ id: debateId, details, marketId }) => {
          if (!details) return null;

          const [
            topic,
            currentRound,
            totalRounds,
            isActive,
            creator,
            judges,
            hasOutcome,
            finalOutcome,
          ] = details;

          return (
            <Card
              key={debateId.toString()}
              className="group p-6 bg-[#52362B] border-2 border-[#52362B] rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden relative"
            >
              <div
                className={`absolute top-0 right-0 w-20 h-20 -mt-10 -mr-10 rotate-45 ${
                  isActive ? "bg-[#D1BB9E]" : "bg-red-500/20"
                }`}
              />

              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#FAF9F6] mb-2"></div>
                  <h3 className="text-xl font-bold text-[#CCAA00] leading-tight group-hover:text-[#CCAA00] transition-colors">
                    {topic}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#FAF9F6]/50">
                  <div className="flex items-center gap-2">
                    <MessagesSquare className="w-4 h-4 text-[#FAF9F6]" />
                    <span className="text-sm text-gray-400">0 Messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-green-500 status-dot animate-blink" />
                      )}
                      <span
                        className={`text-sm ${
                          isActive ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {isActive ? "Active" : "Completed"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FAF9F6]" />
                    <span className="text-sm text-gray-400">
                      {currentRound.toString()}/{totalRounds.toString()} Rounds
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#FAF9F6]" />
                    <span className="text-sm text-gray-400">
                      {judges} Judges
                    </span>
                  </div>
                </div>

                <div className="h-[300px] border-t border-gray-800">
                  <ChatWindow marketId={marketId} />
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#FAF9F6]/20 flex items-center justify-center">
                      <Award className="w-4 h-4 text-[#FAF9F6]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400">Created by</span>
                      <span className="text-sm text-white">
                        {formatAddress(creator.toString())}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#FAF9F6] hover:text-black hover:bg-[#FAF9F6] transition-colors"
                    onClick={() => handleDebateClick(debateId.toString())}
                  >
                    View
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            className="border-[#52362B] font-semibold text-[#52362B] pixelated-2 hover:bg-[#52362B] hover:text-white transition-colors gap-2"
          >
            <Plus className="w-4 h-4 pixelated-2" />
            Load More Debates
          </Button>
        </div>
      )}
    </div>
  );
}

export default DebateList;
