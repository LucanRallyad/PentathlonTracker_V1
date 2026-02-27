/**
 * Composable middleware chain utility.
 *
 * Usage:
 *   const handler = compose(
 *     withAuth(['ADMIN']),
 *     withRateLimit(RATE_LIMIT_TIERS.admin),
 *     withValidation(mySchema)
 *   )(actualHandler);
 */

import { NextRequest, NextResponse } from 'next/server';

type MiddlewareWrapper = <T extends unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) => (req: NextRequest, ...args: T) => Promise<NextResponse>;

/**
 * Compose multiple middleware wrappers into a single wrapper.
 * Middleware is applied left-to-right (first listed runs first).
 */
export function compose(...middlewares: MiddlewareWrapper[]): MiddlewareWrapper {
  return <T extends unknown[]>(
    handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
  ) => {
    // Apply middleware from right to left so the first middleware wraps the outermost layer
    return middlewares.reduceRight(
      (wrapped, mw) => mw(wrapped),
      handler
    );
  };
}

// Re-export all middleware for convenience
export { withAuth } from './withAuth';
export { withOwnership } from './withOwnership';
export { withCompetitionAccess } from './withCompetitionAccess';
export { withRateLimit, RATE_LIMIT_TIERS, checkRateLimit } from './withRateLimit';
export { withValidation } from './withValidation';
export { filterFieldsForRole, filterArrayForRole } from './fieldFilter';
export { withCsrfProtection, generateCsrfToken, getCsrfTokenFromCookie, CSRF_TOKEN_HEADER } from '@/lib/security/csrf';
