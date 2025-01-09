import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { marketId: string } }
) {
  try {
    const marketId = params.marketId;
    const coordinatorUrl = process.env.NEXT_PUBLIC_COORDINATOR_URL;
    if (!coordinatorUrl) {
      throw new Error('NEXT_PUBLIC_COORDINATOR_URL environment variable is not set');
    }

    // Forward the request to the coordinator service
    const response = await fetch(`${coordinatorUrl}/api/chat/${marketId}`);
    const messages = await response.json();
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch chat messages' }, { status: 500 });
  }
} 