import { defineEventHandler, toWebRequest } from "h3";
import { auth } from "../../utils/auth";

// All better-auth endpoints: sign-up/in/out, sessions, password reset, email
// verification, MiData OAuth, plans (organizations), members, invitations.
export default defineEventHandler((event) => auth.handler(toWebRequest(event)));
