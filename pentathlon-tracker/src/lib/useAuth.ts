import useSWR from "swr";

interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  role: string;
  athleteId?: string | null;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) return { user: null, athleteId: null };
    return r.json();
  });

/**
 * Shared SWR-based auth hook.
 * All components using this share the same cached response —
 * only ONE network request is made, regardless of how many
 * Sidebar/TopNav/Dashboard instances mount simultaneously.
 */
export function useAuth() {
  const { data, isLoading, mutate } = useSWR<{
    user: AuthUser | null;
    athleteId?: string | null;
  }>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60_000, // cache for 60s — no duplicate requests within this window
  });

  return {
    user: data?.user ?? null,
    athleteId: data?.user?.athleteId ?? data?.athleteId ?? null,
    isLoading,
    mutate,
  };
}
