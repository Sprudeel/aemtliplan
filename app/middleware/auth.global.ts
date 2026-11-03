// Every page needs a login, except pages marked `public` (wall view) or `guest` (login, register ...).
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.public) return;

  const { ensure } = useAuthSession();
  const session = await ensure();

  if (to.meta.guest) {
    if (session) {
      const redirect = typeof to.query.redirect === "string" ? to.query.redirect : "/plans";
      return navigateTo(redirect.startsWith("/") ? redirect : "/plans");
    }
    return;
  }

  if (!session) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }
});
