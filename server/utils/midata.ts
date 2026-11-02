// MiData (hitobito, db.scout.ch) integration: OAuth/OIDC login + reading camps.
// Docs: hitobito doc/developer/people/oauth.md and doc/developer/common/api/json_api.md
import type { GenericOAuthConfig } from "better-auth/plugins/generic-oauth";

export const MIDATA_PROVIDER_ID = "midata";

export const midataBaseUrl = (process.env.MIDATA_URL ?? "https://db.scout.ch").replace(/\/$/, "");

interface MidataProfile {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  [key: string]: unknown;
}

/** Scout name if set, else first + last name. */
export function midataDisplayName(person: MidataProfile): string {
  const nickname = person.nickname?.trim();
  if (nickname) return nickname;
  return [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || "MiData";
}

function buildConfig(): GenericOAuthConfig | null {
  const clientId = process.env.MIDATA_CLIENT_ID?.trim();
  const clientSecret = process.env.MIDATA_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return {
    providerId: MIDATA_PROVIDER_ID,
    name: "MiData",
    discoveryUrl: `${midataBaseUrl}/.well-known/openid-configuration`,
    clientId,
    clientSecret,
    // `api` lets us read the user's camps and participants with their own token.
    scopes: ["openid", "email", "name", "api"],
    mapProfileToUser: (profile) => ({
      name: midataDisplayName(profile as MidataProfile),
    }),
  };
}

export const midataConfig = buildConfig();

// ---------- JSON:API client (uses the signed-in user's access token) ----------

interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data?: { id: string; type: string } | null }>;
}

interface JsonApiDocument {
  data: JsonApiResource[];
  included?: JsonApiResource[];
}

async function midataGet(token: string, path: string, query: Record<string, string>) {
  const url = new URL(`${midataBaseUrl}${path}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
  });
  if (!response.ok) {
    throw new Error(`MiData ${path} failed with ${response.status}`);
  }
  return (await response.json()) as JsonApiDocument;
}

export interface MidataCamp {
  id: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
}

/**
 * Camps the user can see. Assumption (verify against /api-docs on db.scout.ch):
 * events carry `type` = "Event::Camp" for camps; events without a type attribute are kept.
 */
export async function listMidataCamps(token: string): Promise<MidataCamp[]> {
  const doc = await midataGet(token, "/api/events", { "page[size]": "200" });
  return doc.data
    .filter((event) => {
      const type = event.attributes.type;
      return typeof type !== "string" || type.includes("Camp");
    })
    .map((event) => {
      const dates = event.attributes.dates as Array<Record<string, string>> | undefined;
      return {
        id: event.id,
        name: String(event.attributes.name ?? `Lager ${event.id}`),
        startsAt: dates?.[0]?.start_at ?? (event.attributes.start_at as string | undefined) ?? null,
        endsAt: dates?.[0]?.finish_at ?? (event.attributes.finish_at as string | undefined) ?? null,
      };
    });
}

export async function getMidataCamp(token: string, eventId: string): Promise<MidataCamp | null> {
  const camps = await listMidataCamps(token);
  return camps.find((camp) => camp.id === eventId) ?? null;
}

/** Display names of all participants of a camp. Assumption: filter[event_id] + include=person. */
export async function listMidataParticipants(token: string, eventId: string): Promise<string[]> {
  const doc = await midataGet(token, "/api/event_participations", {
    "filter[event_id]": eventId,
    include: "person",
    "page[size]": "500",
  });
  const people = new Map(
    (doc.included ?? [])
      .filter((resource) => resource.type === "people")
      .map((person) => [person.id, person.attributes as MidataProfile]),
  );
  return doc.data
    .map((participation) => {
      const personId = participation.relationships?.person?.data?.id;
      const person = personId ? people.get(personId) : undefined;
      return person ? midataDisplayName(person) : null;
    })
    .filter((value): value is string => Boolean(value));
}

/** Makes names unique by appending " 2", " 3", ... (members must be unique per plan). */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((raw) => {
    const name = raw.trim();
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${name} ${count}`;
  });
}
