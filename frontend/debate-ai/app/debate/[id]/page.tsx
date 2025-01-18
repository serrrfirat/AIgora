"use client";

import { DebateView } from "@/components/DebateView";
import { DebateView2 } from "../../../components/DebateView2";

export default function DebatePage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-8">
      <DebateView2 debateId={Number(params.id)} />
    </div>
  );
}
