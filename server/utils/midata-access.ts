import type { H3Event } from "h3";
import { requireSession } from "./access";
import { auth } from "./auth";
import { apiError } from "./errors";
import { MIDATA_PROVIDER_ID, midataConfig } from "./midata";
import prisma from "./prisma";

/** The signed-in user's MiData access token (refreshed by better-auth when expired). */
export async function requireMidataToken(event: H3Event): Promise<string> {
  if (!midataConfig) throw apiError(503, "MIDATA_NOT_CONFIGURED", "MiData login is not configured");
  const session = await requireSession(event);

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: MIDATA_PROVIDER_ID },
    select: { id: true },
  });
  if (!account) throw apiError(403, "MIDATA_NOT_LINKED", "Sign in with MiData first");

  try {
    const result = await auth.api.getAccessToken({
      headers: event.headers,
      body: { accountId: account.id },
    });
    if (result?.accessToken) return result.accessToken;
  } catch (error) {
    console.warn("[midata] could not get access token", error);
  }
  throw apiError(403, "MIDATA_TOKEN_EXPIRED", "MiData session expired, sign in with MiData again");
}
