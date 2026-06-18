/**
 * Server-side event emitter for real-time data synchronization
 * Broadcasts CRUD events to connected clients via SSE
 */

export type EventType = 
  | 'menu:created' | 'menu:updated' | 'menu:deleted'
  | 'gallery:created' | 'gallery:updated' | 'gallery:deleted'
  | 'reservation:created' | 'reservation:updated' | 'reservation:cancelled'
  | 'order:created' | 'order:updated' | 'order:cancelled'
  | 'review:created' | 'review:responded'
  | 'profile:updated'
  | 'guest:updated';

export interface DataEvent {
  type: EventType;
  entityId: string;
  vendorId: string;
  data: any;
  timestamp: number;
}

type EventCallback = (event: DataEvent) => void;

class EventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private globalListeners: Set<EventCallback> = new Set();

  /**
   * Subscribe to events for a specific vendor
   */
  subscribe(vendorId: string, callback: EventCallback): () => void {
    if (!this.listeners.has(vendorId)) {
      this.listeners.set(vendorId, new Set());
    }
    this.listeners.get(vendorId)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(vendorId)?.delete(callback);
    };
  }

  /**
   * Subscribe to all events (for admin)
   */
  subscribeAll(callback: EventCallback): () => void {
    this.globalListeners.add(callback);
    return () => {
      this.globalListeners.delete(callback);
    };
  }

  /**
   * Emit an event to all subscribers for a vendor
   */
  emit(event: DataEvent): void {
    // Notify vendor-specific listeners
    const vendorListeners = this.listeners.get(event.vendorId);
    if (vendorListeners) {
      vendorListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }

    // Notify global listeners (admin)
    this.globalListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Global event listener error:', error);
      }
    });
  }

  /**
   * Get count of active listeners
   */
  getListenerCount(vendorId?: string): number {
    if (vendorId) {
      return this.listeners.get(vendorId)?.size || 0;
    }
    let total = this.globalListeners.size;
    this.listeners.forEach(set => {
      total += set.size;
    });
    return total;
  }
}

// Singleton instance
export const eventEmitter = new EventEmitter();

/**
 * Helper function to broadcast events from API routes
 */
export function broadcastEvent(
  type: EventType,
  entityId: string,
  vendorId: string,
  data: any
): void {
  eventEmitter.emit({
    type,
    entityId,
    vendorId,
    data,
    timestamp: Date.now(),
  });
}
