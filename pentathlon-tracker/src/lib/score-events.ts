/**
 * Server-side event emitter for score updates.
 *
 * When an admin saves scores via the score entry API, this emitter broadcasts
 * the update to all connected SSE clients (athlete dashboards, profile pages,
 * competition views). Clients re-fetch their data on receiving an event.
 *
 * Uses a global singleton to survive Next.js hot-reloads in development.
 */

export interface ScoreEvent {
  /** Which competition the scores belong to */
  competitionId: string;
  /** Which discipline was scored */
  discipline: string;
  /** List of athlete IDs whose scores changed */
  athleteIds: string[];
  /** Timestamp of the update */
  timestamp: number;
}

type ScoreEventListener = (event: ScoreEvent) => void;

class ScoreEventEmitter {
  private listeners = new Set<ScoreEventListener>();

  /** Subscribe to score updates. Returns an unsubscribe function. */
  subscribe(listener: ScoreEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Broadcast a score update to all connected listeners. */
  emit(event: ScoreEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Don't let one bad listener kill the broadcast
      }
    }
  }

  /** Number of currently connected listeners (for debugging). */
  get listenerCount(): number {
    return this.listeners.size;
  }
}

// Use a global singleton to survive Next.js hot-reloads
const globalForScoreEvents = globalThis as unknown as {
  __scoreEventEmitter?: ScoreEventEmitter;
};

export const scoreEvents =
  globalForScoreEvents.__scoreEventEmitter ??
  (globalForScoreEvents.__scoreEventEmitter = new ScoreEventEmitter());
