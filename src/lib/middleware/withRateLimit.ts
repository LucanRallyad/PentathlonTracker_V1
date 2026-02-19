import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorCode } from '@/lib/errors/AppError';
import { handleApiError } from '@/lib/errors/errorHandler';

/**
 * Sliding window rate limiter.
 * Stores state in memory (resets on server restart — for SQLite persistence, use the DB).
 */

interface RateLimitEntry {
  timestamps: number[];
}

// In-memory store keyed by identifier
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter(t => now - t < 600_000); // 10 min max window
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 300_000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: NextRequest) => string;
}

// Predefined tiers
export const RATE_LIMIT_TIERS = {
  public: { maxRequests: 30, windowMs: 60_000 } as RateLimitConfig,
  authenticated: { maxRequests: 120, windowMs: 60_000 } as RateLimitConfig,
  scoreEntry: { maxRequests: 300, windowMs: 60_000 } as RateLimitConfig,
  auth: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
  dobLogin: { maxRequests: 3, windowMs: 600_000 } as RateLimitConfig,
  admin: { maxRequests: 200, windowMs: 60_000 } as RateLimitConfig,
  search: { maxRequests: 20, windowMs: 60_000 } as RateLimitConfig,
  searchAuth: { maxRequests: 60, windowMs: 60_000 } as RateLimitConfig,
} as const;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Check rate limit without middleware wrapping (for use in custom handlers).
 * Returns { allowed, retryAfter } where retryAfter is in seconds.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfter: number; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { timestamps: [] };

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter(t => now - t < config.windowMs);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfter = Math.ceil((oldest + config.windowMs - now) / 1000);
    rateLimitStore.set(key, entry);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  entry.timestamps.push(now);
  rateLimitStore.set(key, entry);
  return {
    allowed: true,
    retryAfter: 0,
    remaining: config.maxRequests - entry.timestamps.length,
  };
}

/**
 * Rate limiting middleware.
 * Usage: withRateLimit(RATE_LIMIT_TIERS.public)(handler)
 */
export function withRateLimit(config: RateLimitConfig) {
  return function <T extends unknown[]>(
    handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
      try {
        const keyGen = config.keyGenerator || ((r: NextRequest) => getClientIp(r));
        const key = `ratelimit:${req.nextUrl.pathname}:${keyGen(req)}`;

        const { allowed, retryAfter, remaining } = checkRateLimit(key, config);

        if (!allowed) {
          const response = NextResponse.json(
            new AppError(ErrorCode.RATE_LIMITED).toClientJSON(),
            { status: 429 }
          );
          response.headers.set('Retry-After', String(retryAfter));
          response.headers.set('X-RateLimit-Remaining', '0');
          return response;
        }

        const response = await handler(req, ...args);
        response.headers.set('X-RateLimit-Remaining', String(remaining));
        return response;
      } catch (error) {
        return handleApiError(error);
      }
    };
  };
}
