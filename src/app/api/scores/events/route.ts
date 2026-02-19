import { scoreEvents, ScoreEvent } from "@/lib/score-events";

/**
 * GET /api/scores/events
 *
 * Server-Sent Events (SSE) endpoint. Clients keep a long-lived connection open
 * and receive real-time notifications whenever scores are saved by an admin.
 *
 * Query params (optional filters):
 *   ?athleteId=xxx   — only receive events that include this athlete
 *   ?competitionId=xxx — only receive events for this competition
 *
 * The client can use these events to trigger SWR revalidation / re-fetches.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const filterAthleteId = url.searchParams.get("athleteId");
  const filterCompetitionId = url.searchParams.get("competitionId");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`)
      );

      // Keep-alive: send a comment every 30s to prevent proxy/browser timeout
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30_000);

      // Subscribe to score events
      const unsubscribe = scoreEvents.subscribe((event: ScoreEvent) => {
        // Apply optional filters
        if (filterCompetitionId && event.competitionId !== filterCompetitionId) return;
        if (filterAthleteId && !event.athleteIds.includes(filterAthleteId)) return;

        try {
          const payload = JSON.stringify({
            type: "score_update",
            competitionId: event.competitionId,
            discipline: event.discipline,
            athleteIds: event.athleteIds,
            timestamp: event.timestamp,
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // Stream closed — clean up
          clearInterval(keepAlive);
          unsubscribe();
        }
      });

      // Clean up when the client disconnects
      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
