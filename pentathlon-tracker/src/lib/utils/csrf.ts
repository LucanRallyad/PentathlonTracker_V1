/**
 * Client-side CSRF token utilities
 * 
 * These utilities help fetch and manage CSRF tokens for API requests.
 */

let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

/**
 * Fetch a CSRF token from the server.
 * Caches the token in memory to avoid unnecessary requests.
 * 
 * @returns Promise that resolves to the CSRF token
 */
export async function fetchCsrfToken(): Promise<string> {
  // Return cached token if available
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  // Return existing promise if a request is in flight
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Fetch new token
  csrfTokenPromise = fetch('/api/csrf-token', {
    method: 'GET',
    credentials: 'include', // Important: include cookies
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        // If not authenticated, clear cache and throw
        csrfTokenCache = null;
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }
      const data = await response.json();
      csrfTokenCache = data.csrfToken;
      return csrfTokenCache!;
    })
    .finally(() => {
      // Clear promise so we can fetch again if needed
      csrfTokenPromise = null;
    });

  return csrfTokenPromise;
}

/**
 * Clear the cached CSRF token.
 * Call this after logout or if you get a 403 CSRF error.
 */
export function clearCsrfTokenCache(): void {
  csrfTokenCache = null;
  csrfTokenPromise = null;
}

/**
 * Get the current CSRF token (from cache if available, otherwise fetch).
 * 
 * @returns Promise that resolves to the CSRF token
 */
export async function getCsrfToken(): Promise<string> {
  if (csrfTokenCache) {
    return csrfTokenCache;
  }
  return fetchCsrfToken();
}

/**
 * Wrapper for fetch that automatically includes CSRF token.
 * Use this instead of regular fetch for POST/PUT/PATCH/DELETE requests.
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, etc.)
 * @returns Promise that resolves to the Response
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  
  // Only include CSRF token for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      const token = await getCsrfToken();
      options.headers = {
        ...options.headers,
        'X-CSRF-Token': token,
      };
    } catch (error) {
      // If CSRF token fetch fails, still try the request
      // (it will fail with 403 if CSRF is required)
      console.warn('Failed to fetch CSRF token:', error);
    }
  }

  // Always include credentials for cookies
  options.credentials = options.credentials || 'include';

  return fetch(url, options);
}
