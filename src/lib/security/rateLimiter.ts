/**
 * Configurable rate limiter with per-endpoint settings.
 * Re-exports the core rate limiter from middleware for standalone use.
 */
export { checkRateLimit, RATE_LIMIT_TIERS } from '@/lib/middleware/withRateLimit';
export type { RateLimitConfig } from '@/lib/middleware/withRateLimit';
