import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { eventEmitter, DataEvent } from '@/lib/realtime/event-emitter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * SSE endpoint for real-time data updates
 * Clients connect to this endpoint to receive live updates
 */
export async function GET(request: NextRequest) {
  // Check for token in query parameter (for SSE connections) or header
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  
  let payload;
  if (queryToken) {
    // Verify query token directly
    const { verifyAccessToken } = await import('@/lib/auth/jwt');
    const { isTokenBlacklisted } = await import('@/services/token.service');
    
    if (await isTokenBlacklisted(queryToken)) {
      return new Response('Unauthorized', { status: 401 });
    }
    payload = await verifyAccessToken(queryToken);
  } else {
    payload = await authenticateRequest(request);
  }

  if (!payload) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get vendor ID for vendor users
  let vendorId: string | null = null;
  if (payload.role === 'vendor') {
    const { db } = await import('@/lib/db');
    const vendor = await db.vendor.findFirst({
      where: { ownerId: payload.sub, deletedAt: null },
      select: { id: true },
    });
    vendorId = vendor?.id || null;
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`));

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Subscribe to events based on role
      const handleEvent = (event: DataEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch (error) {
          console.error('SSE send error:', error);
        }
      };

      if (payload.role === 'admin') {
        // Admin gets all events
        unsubscribe = eventEmitter.subscribeAll(handleEvent);
      } else if (vendorId) {
        // Vendor gets their own events
        unsubscribe = eventEmitter.subscribe(vendorId, handleEvent);
      }

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        if (unsubscribe) unsubscribe();
      });
    },
    cancel() {
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    },
  });
}
