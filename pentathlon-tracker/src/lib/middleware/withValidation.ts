import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { AppError, ErrorCode } from '@/lib/errors/AppError';
import { handleApiError } from '@/lib/errors/errorHandler';
import { sanitizeString } from '@/lib/validation/sanitize';

/**
 * Validation middleware using Zod schemas.
 * Validates request body or query params against a schema.
 * Sanitizes all string inputs against XSS.
 *
 * Usage: withValidation(myZodSchema, 'body')(handler)
 */
export function withValidation(schema: ZodSchema, source: 'body' | 'query' = 'body') {
  return function <T extends unknown[]>(
    handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
      try {
        let data: unknown;

        if (source === 'body') {
          try {
            data = await req.json();
          } catch {
            throw new AppError(ErrorCode.VALIDATION_FAILED, 'Invalid JSON body');
          }
        } else {
          const params = new URL(req.url).searchParams;
          data = Object.fromEntries(params.entries());
        }

        // Sanitize all string values before validation
        data = deepSanitize(data);

        const result = schema.safeParse(data);
        if (!result.success) {
          const errors = formatZodErrors(result.error);
          throw new AppError(ErrorCode.VALIDATION_FAILED, 'Validation failed', errors);
        }

        // Attach validated data to the request for downstream use
        (req as NextRequest & { validatedData: unknown }).validatedData = result.data;

        return await handler(req, ...args);
      } catch (error) {
        return handleApiError(error);
      }
    };
  };
}

/**
 * Recursively sanitize all string values in an object.
 */
function deepSanitize(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map(deepSanitize);
  }
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[sanitizeString(key)] = deepSanitize(val);
    }
    return sanitized;
  }
  return value;
}

function formatZodErrors(error: ZodError): Record<string, unknown> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    errors[path || '_root'] = issue.message;
  }
  return errors;
}
