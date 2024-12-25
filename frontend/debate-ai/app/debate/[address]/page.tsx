import { DebateView } from '@/components/DebateView';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface DebatePageProps {
  params: {
    address: string;
  };
}

export default function DebatePage({ params }: DebatePageProps) {
  return (
    <main className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link href="/">
            <Button variant="outline">← Back to Debates</Button>
          </Link>
        </div>
        
        <DebateView debateAddress={params.address} />
      </div>
    </main>
  );
} 