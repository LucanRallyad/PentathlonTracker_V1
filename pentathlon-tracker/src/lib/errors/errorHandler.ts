import { NextResponse } from 'next/server';
import { AppError, ErrorCode } from './AppError';

/**
 * Global error handler — logs full details server-side,
 * returns safe generic messages to clients.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    // Log internal message for debugging (never sent to client)
    console.error(
      `[AppError] ${error.code} — ${error.message}`,
      error.details ? JSON.stringify(error.details) : ''
    );
    return NextResponse.json(error.toClientJSON(), { status: error.statusCode });
  }

  // Unknown errors — log full stack, return generic message
  if (error instanceof Error) {
    console.error(`[UnhandledError] ${error.message}\n${error.stack}`);
  } else {
    console.error('[UnhandledError] Non-error thrown:', error);
  }

  const appError = new AppError(ErrorCode.INTERNAL_ERROR);
  return NextResponse.json(appError.toClientJSON(), { status: 500 });
}
