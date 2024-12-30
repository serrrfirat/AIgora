'use client';

import { DebateView } from '@/components/DebateView';

export default function DebatePage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-8">
      <DebateView debateId={Number(params.id)} />
    </div>
  );
} 