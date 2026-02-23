import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppError, ErrorCode } from '@/lib/errors/AppError';
import { handleApiError } from '@/lib/errors/errorHandler';

/**
 * Resource ownership middleware.
 * Verifies the requesting user owns the resource OR is an admin/official.
 *
 * Usage: withOwnership('athleteId')(handler)
 * The paramName is the route parameter or body field that identifies the resource owner's athlete ID.
 */
export function withOwnership(paramName: string = 'id') {
  return function <T extends unknown[]>(
    handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
      try {
        const session = getSessionFromCookie(req.headers.get('cookie'));
        if (!session) {
          throw new AppError(ErrorCode.AUTH_REQUIRED);
        }

        // Admins and officials bypass ownership check
        if ('userId' in session) {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { role: true },
          });
          if (user && (user.role === 'super_admin' || user.role === 'admin' || user.role === 'official')) {
            return await handler(req, ...args);
          }
        }

        // Resolve the target resource's athlete ID from route params
        // args[0] is typically { params: Promise<{ id: string }> } in Next.js 16
        let targetAthleteId: string | undefined;
        if (args[0] && typeof args[0] === 'object' && 'params' in (args[0] as Record<string, unknown>)) {
          const routeParams = await (args[0] as { params: Promise<Record<string, string>> }).params;
          targetAthleteId = routeParams[paramName];
        }

        if (!targetAthleteId) {
          throw new AppError(ErrorCode.OWNERSHIP_REQUIRED, 'Could not determine resource owner');
        }

        // Resolve the requesting user's athlete ID
        let requestingAthleteId: string | undefined;

        if ('athleteId' in session) {
          requestingAthleteId = session.athleteId;
        } else if ('userId' in session) {
          const athlete = await prisma.athlete.findUnique({
            where: { userId: session.userId },
            select: { id: true },
          });
          requestingAthleteId = athlete?.id;
        }

        if (!requestingAthleteId || requestingAthleteId !== targetAthleteId) {
          throw new AppError(
            ErrorCode.OWNERSHIP_REQUIRED,
            `User athlete ${requestingAthleteId} cannot access resource owned by ${targetAthleteId}`
          );
        }

        return await handler(req, ...args);
      } catch (error) {
        return handleApiError(error);
      }
    };
  };
}
