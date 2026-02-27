import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppError, ErrorCode } from '@/lib/errors/AppError';
import { handleApiError } from '@/lib/errors/errorHandler';

/**
 * Competition-scoped access middleware.
 * For now, any admin or official can access any competition.
 * This can be extended to check a CompetitionOfficial junction table
 * when per-competition assignment is implemented.
 */
export function withCompetitionAccess(competitionIdParam: string = 'id') {
  return function <T extends unknown[]>(
    handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
      try {
        const session = getSessionFromCookie(req.headers.get('cookie'));
        if (!session) {
          throw new AppError(ErrorCode.AUTH_REQUIRED);
        }

        if (!('userId' in session)) {
          throw new AppError(ErrorCode.COMPETITION_ACCESS_DENIED, 'Only officials can modify competitions');
        }

        const user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { role: true },
        });

        if (!user || (user.role !== 'admin' && user.role !== 'official')) {
          throw new AppError(ErrorCode.COMPETITION_ACCESS_DENIED);
        }

        // Verify competition exists
        let competitionId: string | undefined;
        if (args[0] && typeof args[0] === 'object' && 'params' in (args[0] as Record<string, unknown>)) {
          const routeParams = await (args[0] as { params: Promise<Record<string, string>> }).params;
          competitionId = routeParams[competitionIdParam];
        }

        if (competitionId) {
          const competition = await prisma.competition.findUnique({
            where: { id: competitionId },
            select: { id: true },
          });

          if (!competition) {
            throw new AppError(ErrorCode.NOT_FOUND, 'Competition not found');
          }
        }

        return await handler(req, ...args);
      } catch (error) {
        return handleApiError(error);
      }
    };
  };
}
