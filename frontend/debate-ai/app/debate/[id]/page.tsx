"use client";

import { DebateView2 } from "../../../components/DebateView2";

export default function DebatePage({ params }: { params: { id: string } }) {
  return (
    <div>
      <DebateView2 debateId={Number(params.id)} />
    </div>
  );
}
