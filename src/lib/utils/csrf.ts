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
 */
export async function fetchCsrfToken(): Promise<string> {
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = fetch("/api/csrf-token", {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        csrfTokenCache = null;
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }
      const data = await response.json();
      csrfTokenCache = data.csrfToken;
      return csrfTokenCache!;
    })
    .finally(() => {
      csrfTokenPromise = null;
    });

  return csrfTokenPromise;
}

export function clearCsrfTokenCache(): void {
  csrfTokenCache = null;
  csrfTokenPromise = null;
}

export async function getCsrfToken(): Promise<string> {
  if (csrfTokenCache) {
    return csrfTokenCache;
  }
  return fetchCsrfToken();
}

/**
 * Wrapper for fetch that automatically includes CSRF token.
 * Use this instead of regular fetch for POST/PUT/PATCH/DELETE requests.
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    try {
      const token = await getCsrfToken();
      options.headers = {
        ...options.headers,
        "X-CSRF-Token": token,
      };
    } catch (error) {
      // If CSRF token fetch fails, still try the request;
      // the server will return 403 if a token is required.
      console.warn("Failed to fetch CSRF token:", error);
    }
  }

  if (!options.credentials) {
    options.credentials = "include";
  }

  return fetch(url, options);
}

