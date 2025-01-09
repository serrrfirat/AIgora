import { NextResponse } from 'next/server';

// Add dynamic configuration to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { marketId: string } }
) {
  try {
    const marketId = params.marketId;
    console.log('[API] Received request for market ID:', marketId);
    
    const coordinatorUrl = process.env.NEXT_PUBLIC_COORDINATOR_URL;
    if (!coordinatorUrl) {
      throw new Error('NEXT_PUBLIC_COORDINATOR_URL environment variable is not set');
    }

    console.log('[API] Forwarding request to coordinator:', `${coordinatorUrl}/api/chat/${marketId}`);
    // Forward the request to the coordinator service with no-cache headers
    const response = await fetch(`${coordinatorUrl}/api/chat/${marketId}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Request-Time': Date.now().toString()
      },
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      console.error('[API] Coordinator response not OK:', response.status, response.statusText);
      throw new Error(`Coordinator responded with status: ${response.status}`);
    }
    
    const messages = await response.json();
    console.log('[API] Received messages from coordinator:', messages.length);
    
    // Return response with no-cache headers
    return new NextResponse(JSON.stringify(messages), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Timer': Date.now().toString(),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch chat messages' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
} 