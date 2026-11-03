import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/vue";

/**
 * better-auth browser client: sign-in/up, password, plans (organizations), invitations.
 * MiData is a generic OAuth provider and works via signIn.social / linkSocial({ provider: "midata" }).
 */
export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

export const MIDATA_PROVIDER = "midata";
