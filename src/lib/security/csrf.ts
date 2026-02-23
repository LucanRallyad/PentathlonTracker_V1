import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSessionFromCookie } from "@/lib/auth";
import { AppError, ErrorCode } from "@/lib/errors/AppError";
import { handleApiError } from "@/lib/errors/errorHandler";

/**
 * CSRF Protection Implementation
 * 
 * Generates and validates CSRF tokens to prevent cross-site request forgery attacks.
 * Tokens are stored in cookies and validated against request headers or body.
 */

const CSRF_TOKEN_COOKIE = "csrf_token";
const CSRF_TOKEN_HEADER = "X-CSRF-Token";
const CSRF_TOKEN_EXPIRY = 60 * 60 * 24; // 24 hours

/**
 * Generate a secure random CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Get CSRF token from cookie
 */
export function getCsrfTokenFromCookie(req: NextRequest): string | null {
  const cookie = req.cookies.get(CSRF_TOKEN_COOKIE);
  return cookie?.value || null;
}

/**
 * Get CSRF token from request header.
 * We use headers only to avoid consuming the request body.
 * Frontend should send token in X-CSRF-Token header.
 */
export function getCsrfTokenFromRequest(req: NextRequest): string | null {
  return req.headers.get(CSRF_TOKEN_HEADER);
}

/**
 * Generate and set CSRF token cookie
 * Call this on GET requests to generate a new token
 */
export function setCsrfTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CSRF_TOKEN_EXPIRY,
    path: "/",
  });
}

/**
 * Validate CSRF token from request against cookie.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function validateCsrfToken(req: NextRequest): boolean {
  const cookieToken = getCsrfTokenFromCookie(req);
  const requestToken = getCsrfTokenFromRequest(req);

  if (!cookieToken || !requestToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== requestToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ requestToken.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Middleware to require CSRF token validation for state-changing operations.
 * Works with Next.js route handlers that take (req, context) or (req, ...args).
 * 
 * Usage:
 *   export const POST = withCsrfProtection(async (req) => { ... });
 *   export const POST = withCsrfProtection(async (req, { params }) => { ... });
 */
export function withCsrfProtection<T extends unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
): (req: NextRequest, ...args: T) => Promise<NextResponse> {
  return async (req: NextRequest, ...args: T) => {
    const method = req.method.toUpperCase();
    
    // Only require CSRF for state-changing methods
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return handler(req, ...args);
    }

    // Skip CSRF for authentication endpoints (they have their own protection via rate limiting)
    const pathname = req.nextUrl.pathname;
    if (pathname.startsWith("/api/auth/")) {
      return handler(req, ...args);
    }

    const isValid = validateCsrfToken(req);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or missing CSRF token", code: "CSRF_TOKEN_INVALID" },
        { status: 403 }
      );
    }

    return handler(req, ...args);
  };
}

/**
 * Generate CSRF token endpoint handler.
 * Call this from the frontend to get a CSRF token.
 * Token is returned in response body AND set as httpOnly cookie.
 */
export async function generateCsrfTokenHandler(req: NextRequest): Promise<NextResponse> {
  // Only allow GET requests
  if (req.method !== "GET") {
    return NextResponse.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }

  // Require authentication
  const session = getSessionFromCookie(req.headers.get("cookie"));
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const token = generateCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  setCsrfTokenCookie(response, token);

  return response;
}

// Export constants for use in frontend
export { CSRF_TOKEN_HEADER };
