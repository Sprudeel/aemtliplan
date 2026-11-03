import type { SessionDto } from "~~/shared/types/api";

/**
 * Current login, loaded once per page load (SSR forwards the cookie).
 * Actions (sign in, sign out, ...) go through authClient in the browser.
 */
export function useAuthSession() {
  const session = useState<SessionDto | null>("auth-session", () => null);
  const loaded = useState<boolean>("auth-session-loaded", () => false);
  const requestFetch = useRequestFetch();

  async function refresh() {
    session.value = await requestFetch<SessionDto | null>("/api/auth/get-session").catch(() => null);
    loaded.value = true;
    return session.value;
  }

  async function ensure() {
    if (!loaded.value) await refresh();
    return session.value;
  }

  async function signOut() {
    await authClient.signOut();
    session.value = null;
    clearNuxtData();
    await navigateTo("/login");
  }

  return {
    session,
    user: computed(() => session.value?.user ?? null),
    refresh,
    ensure,
    signOut,
  };
}
