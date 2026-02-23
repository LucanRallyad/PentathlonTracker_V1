import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie, Session } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppError, ErrorCode } from '@/lib/errors/AppError';
import { handleApiError } from '@/lib/errors/errorHandler';

export type AuthenticatedRequest = NextRequest & {
  session: Session;
  user?: { id: string; name: string; email: string; role: string };
  athleteId?: string;
};

type ValidRole = 'admin' | 'official' | 'athlete';

/**
 * Role-based authentication middleware factory.
 * Usage: withAuth(['ADMIN', 'OFFICIAL'])(handler)
 *
 * Roles are case-insensitive. Passing an empty array allows any authenticated user.
 * Passing no argument allows any authenticated user.
 */
export function withAuth(requiredRoles?: string[]) {
  const normalizedRoles = requiredRoles?.map(r => r.toLowerCase() as ValidRole);

  return function <T extends unknown[]>(
    handler: (req: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
      try {
        const session = getSessionFromCookie(req.headers.get('cookie'));

        if (!session) {
          throw new AppError(ErrorCode.AUTH_REQUIRED, 'No session cookie present');
        }

        // Resolve user details from session
        let userRole: string;
        const authReq = req as AuthenticatedRequest;
        authReq.session = session;

        if ('userId' in session) {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { id: true, name: true, email: true, role: true },
          });

          if (!user) {
            throw new AppError(ErrorCode.AUTH_SESSION_INVALID, 'Session user not found');
          }

          authReq.user = user;
          userRole = user.role;
        } else if ('athleteId' in session) {
          userRole = 'athlete';
          authReq.athleteId = session.athleteId;
        } else {
          throw new AppError(ErrorCode.AUTH_SESSION_INVALID, 'Malformed session');
        }

        // Check role if specified
        if (normalizedRoles && normalizedRoles.length > 0) {
          if (!normalizedRoles.includes(userRole as ValidRole)) {
            throw new AppError(
              ErrorCode.INSUFFICIENT_ROLE,
              `Role '${userRole}' not in required roles: ${normalizedRoles.join(', ')}`
            );
          }
        }

        return await handler(authReq, ...args);
      } catch (error) {
        return handleApiError(error);
      }
    };
  };
}
