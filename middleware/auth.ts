import type { UserRecord } from "~/types/users";

const loginRoute = "/login";

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === loginRoute) return;

  const userState = useState<UserRecord | null>("auth-user", () => null);
  const initialized = useState<boolean>("auth-user-initialized", () => false);

  if (!initialized.value) {
    try {
      const headers = import.meta.server
        ? useRequestHeaders(["cookie"])
        : undefined;
      const sessionUser = await $fetch<UserRecord | null>("/api/user", {
        headers,
      });
      userState.value = sessionUser ?? null;
    } catch (error) {
      console.warn("Failed to verify session", error);
      userState.value = null;
    } finally {
      initialized.value = true;
    }
  }

  if (!userState.value) {
    return navigateTo(loginRoute, {
      replace: true,
      redirectCode: import.meta.server ? 302 : undefined,
    });
  }
});
