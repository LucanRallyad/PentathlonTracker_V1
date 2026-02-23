import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Root Proxy
 * Applies security headers, CSRF protection, and request size limits to all responses.
 */

const MAX_BODY_SIZE = 1024 * 1024; // 1MB for JSON requests
const MAX_URL_LENGTH = 2048;
const MAX_HEADER_SIZE = 8192; // 8KB

export default function proxy(req: NextRequest) {
  const response = NextResponse.next();
  const isProd = process.env.NODE_ENV === 'production';
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/');

  // ── Request Size Limits ────────────────────────────────────────────────────

  try {
    // Check URL length
    const url = req.url;
    if (url.length > MAX_URL_LENGTH) {
      return NextResponse.json(
        { error: 'Request URL too long' },
        { status: 414 }
      );
    }

    // Check header size (approximate)
    try {
      const headersSize = JSON.stringify(Object.fromEntries(req.headers.entries())).length;
      if (headersSize > MAX_HEADER_SIZE) {
        return NextResponse.json(
          { error: 'Request headers too large' },
          { status: 431 }
        );
      }
    } catch (error) {
      // If header serialization fails, continue (non-critical check)
      console.warn('Failed to check header size:', error);
    }

    // For API routes, check Content-Length header
    if (isApiRoute) {
      const contentLength = req.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (!isNaN(size) && size > MAX_BODY_SIZE) {
          return NextResponse.json(
            { error: 'Request body too large' },
            { status: 413 }
          );
        }
      }
    }
  } catch (error) {
    // If size checks fail, log and continue (fail open for development)
    console.error('Request size check error:', error);
  }

  // ── Security Headers ──────────────────────────────────────────────────────

  // Content Security Policy
  // In development, allow network access for local network testing
  // In production, strict same-origin policy
  const csp = isProd
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    : [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // unsafe-eval needed for Next.js dev
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src *",  // Allow all connections in development for network access
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '0'); // Rely on CSP instead
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Remove X-Powered-By
  response.headers.delete('X-Powered-By');

  // HSTS in production only
  if (isProd) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  // ── Cache Control for API responses ───────────────────────────────────────

  const isAuthenticatedApi =
    isApiRoute && req.cookies.has('pentathlon_session');

  if (isAuthenticatedApi) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
  }

  // ── CSRF Protection ───────────────────────────────────────────────────────

  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (isApiRoute && mutatingMethods.includes(req.method)) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');

    // In development, allow requests from local network IPs
    if (origin) {
      try {
        const originUrl = new URL(origin);
        const originHostname = originUrl.hostname;
        
        // Allow same origin
        if (originHostname === host) {
          // Same origin, allow
        }
        // In development, allow local network IPs and ngrok tunnels
        else if (!isProd && (
          originHostname.startsWith('172.30.') ||
          originHostname.startsWith('192.168.') ||
          originHostname.startsWith('10.') ||
          originHostname === 'localhost' ||
          originHostname === '127.0.0.1' ||
          originHostname.endsWith('.ngrok-free.dev') ||
          originHostname.endsWith('.ngrok.io') ||
          originHostname.endsWith('.ngrok.app')
        )) {
          // Allow local network access and ngrok tunnels in development
        }
        // In production, strict CSRF check
        else if (isProd && originHostname !== host) {
          return NextResponse.json(
            { error: 'CSRF validation failed' },
            { status: 403 }
          );
        }
      } catch (e) {
        // Invalid origin URL, block in production
        if (isProd) {
          return NextResponse.json(
            { error: 'CSRF validation failed' },
            { status: 403 }
          );
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and _next
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
