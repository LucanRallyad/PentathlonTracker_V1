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
 * Get CSRF token from request header or body
 */
export async function getCsrfTokenFromRequest(req: NextRequest): Promise<string | null> {
  // Check header first
  const headerToken = req.headers.get(CSRF_TOKEN_HEADER);
  if (headerToken) {
    return headerToken;
  }

  // For POST/PUT/PATCH/DELETE, check body
  const method = req.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    try {
      const body = await req.json();
      return body.csrfToken || null;
    } catch {
      // If body parsing fails, return null
      return null;
    }
  }

  return null;
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
 * Validate CSRF token from request against cookie
 */
export async function validateCsrfToken(req: NextRequest): Promise<boolean> {
  const cookieToken = getCsrfTokenFromCookie(req);
  const requestToken = await getCsrfTokenFromRequest(req);

  if (!cookieToken || !requestToken) {
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  return cookieToken === requestToken;
}

/**
 * Middleware to require CSRF token validation for state-changing operations
 */
export function requireCsrfToken<T = any>(
  handler: (req: NextRequest, context: T) => Promise<NextResponse>
): (req: NextRequest, context: T) => Promise<NextResponse> {
  return async (req: NextRequest, context: T) => {
    const method = req.method.toUpperCase();
    
    // Only require CSRF for state-changing methods
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return handler(req, context);
    }

    // Skip CSRF for authentication endpoints (they have their own protection)
    const pathname = req.nextUrl.pathname;
    if (pathname.startsWith("/api/auth/")) {
      return handler(req, context);
    }

    const isValid = await validateCsrfToken(req);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }

    return handler(req, context);
  };
}

/**
 * Generate CSRF token endpoint handler
 * Call this from the frontend to get a CSRF token
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
