'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';

interface DataEvent {
  type: string;
  entityId: string;
  vendorId: string;
  data: any;
  timestamp: number;
}

// Map event types to query keys that should be invalidated
const EVENT_TO_QUERY_MAP: Record<string, string[]> = {
  'menu:created': ['menu-items', 'menu-categories'],
  'menu:updated': ['menu-items', 'menu-categories'],
  'menu:deleted': ['menu-items', 'menu-categories'],
  'gallery:created': ['gallery'],
  'gallery:updated': ['gallery'],
  'gallery:deleted': ['gallery'],
  'reservation:created': ['reservations', 'dashboard'],
  'reservation:updated': ['reservations', 'dashboard'],
  'reservation:cancelled': ['reservations', 'dashboard'],
  'order:created': ['orders', 'dashboard'],
  'order:updated': ['orders', 'dashboard'],
  'order:cancelled': ['orders', 'dashboard'],
  'review:created': ['reviews', 'dashboard'],
  'review:responded': ['reviews'],
  'profile:updated': ['settings-profile', 'vendor-profile'],
  'guest:updated': ['guests', 'guest-profiles'],
};

interface UseRealtimeSyncOptions {
  enabled?: boolean;
  onEvent?: (event: DataEvent) => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

/**
 * Hook to subscribe to real-time data updates via SSE
 * Automatically invalidates React Query cache when relevant events occur
 */
export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const {
    enabled = true,
    onEvent,
    onError,
    onConnected,
    onDisconnected,
  } = options;

  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    const token = Cookies.get('vendor_token');
    if (!token) {
      console.warn('No auth token, skipping SSE connection');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const url = `${apiUrl}/api/realtime/events?token=${encodeURIComponent(token)}`;

    try {
      const eventSource = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connected');
        reconnectAttempts.current = 0;
        onConnected?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const data: DataEvent = JSON.parse(event.data);
          
          // Handle ping/connected messages
          if (data.type === 'ping' || data.type === 'connected') {
            return;
          }

          // Invoke custom event handler
          onEvent?.(data);

          // Invalidate relevant queries
          const queriesToInvalidate = EVENT_TO_QUERY_MAP[data.type];
          if (queriesToInvalidate) {
            queriesToInvalidate.forEach(queryKey => {
              queryClient.invalidateQueries({ queryKey: [queryKey] });
            });
          }
        } catch (error) {
          console.error('Error parsing SSE event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
        eventSourceRef.current = null;
        onDisconnected?.();
        onError?.(new Error('SSE connection error'));

        // Attempt reconnection with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      onError?.(error as Error);
    }
  }, [queryClient, onEvent, onError, onConnected, onDisconnected]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected: !!eventSourceRef.current,
    reconnect: connect,
    disconnect,
  };
}

/**
 * Hook to manually trigger cache invalidation
 * Useful when you know data has changed outside of SSE
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return useCallback((queryKeys: string[]) => {
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  }, [queryClient]);
}
