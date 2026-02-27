"use client";

import { useEffect, useRef, useCallback } from "react";

interface ScoreUpdateEvent {
  type: "connected" | "score_update";
  competitionId?: string;
  discipline?: string;
  athleteIds?: string[];
  timestamp?: number;
}

interface UseScoreUpdatesOptions {
  /** Only listen for updates for this athlete */
  athleteId?: string | null;
  /** Only listen for updates for this competition */
  competitionId?: string | null;
  /** Called whenever a score update is received (use this to trigger SWR mutate) */
  onUpdate: () => void;
  /** Whether to enable the SSE connection (default: true) */
  enabled?: boolean;
}

/**
 * Hook that connects to the SSE score-events endpoint and calls `onUpdate`
 * whenever a relevant score change is broadcast by the server.
 *
 * Usage:
 *   useScoreUpdates({
 *     athleteId: "abc123",
 *     onUpdate: () => mutate(),  // triggers SWR re-fetch
 *   });
 *
 * The connection auto-reconnects on failure with exponential backoff.
 */
export function useScoreUpdates({
  athleteId,
  competitionId,
  onUpdate,
  enabled = true,
}: UseScoreUpdatesOptions): void {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const reconnectAttempt = useRef(0);

  const connect = useCallback(() => {
    if (!enabled) return undefined;

    const params = new URLSearchParams();
    if (athleteId) params.set("athleteId", athleteId);
    if (competitionId) params.set("competitionId", competitionId);

    const qs = params.toString();
    const url = `/api/scores/events${qs ? `?${qs}` : ""}`;

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data: ScoreUpdateEvent = JSON.parse(event.data);

        if (data.type === "connected") {
          // Successfully connected — reset reconnect counter
          reconnectAttempt.current = 0;
          return;
        }

        if (data.type === "score_update") {
          // Trigger the consumer's callback (typically a SWR mutate)
          onUpdateRef.current();
        }
      } catch {
        // Ignore malformed messages
      }
    };

    eventSource.onerror = () => {
      eventSource.close();

      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30_000);
      reconnectAttempt.current++;

      setTimeout(() => {
        connect();
      }, delay);
    };

    return eventSource;
  }, [athleteId, competitionId, enabled]);

  useEffect(() => {
    const eventSource = connect();
    return () => {
      eventSource?.close();
    };
  }, [connect]);
}
