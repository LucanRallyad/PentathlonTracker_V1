import { NextRequest } from "next/server";
import { generateCsrfTokenHandler } from "@/lib/security/csrf";

/**
 * GET /api/csrf-token
 * 
 * Returns a CSRF token for authenticated users.
 * Token is returned in response body AND set as httpOnly cookie.
 * Frontend should read the token from response body and include it
 * in X-CSRF-Token header for all POST/PUT/PATCH/DELETE requests.
 */
export async function GET(req: NextRequest) {
  return generateCsrfTokenHandler(req);
}
