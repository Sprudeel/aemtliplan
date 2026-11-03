// Reads the machine-readable error code from our API errors ({ data: { code } })
// and from better-auth client errors ({ code }).

interface ErrorLike {
  data?: { data?: { code?: string; issues?: { names?: string[] } }; code?: string };
  code?: string;
  error?: { code?: string };
}

export function errorCode(error: unknown): string | null {
  const e = error as ErrorLike | null | undefined;
  return e?.data?.data?.code ?? e?.data?.code ?? e?.error?.code ?? e?.code ?? null;
}

/** Names listed by MEMBER_IN_OTHER_GROUP, joined for display. */
export function errorNames(error: unknown): string {
  const names = (error as ErrorLike | null | undefined)?.data?.data?.issues?.names;
  return Array.isArray(names) ? names.join(", ") : "";
}

/** better-auth client calls return { error } instead of throwing. */
export function unwrapAuth<R extends { data: unknown; error: unknown }>(result: R): NonNullable<R["data"]> {
  if (result.error) throw result.error;
  return result.data as NonNullable<R["data"]>;
}

type PlainFetchOptions = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown };

/** $fetch without Nitro's typed route matching (too deep for some nested routes). */
export function plainFetch<T = unknown>(url: string, options?: PlainFetchOptions): Promise<T> {
  const fetcher = globalThis.$fetch as unknown as (url: string, options?: PlainFetchOptions) => Promise<T>;
  return fetcher(url, options);
}
