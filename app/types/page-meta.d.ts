declare module "#app" {
  interface PageMeta {
    /** No login needed and no session lookup (public wall view). */
    public?: boolean;
    /** Only for signed-out users (login, register, ...); signed-in users are redirected. */
    guest?: boolean;
    /** Only plan admins; viewers see a notice instead. */
    adminOnly?: boolean;
  }
}

export {};
