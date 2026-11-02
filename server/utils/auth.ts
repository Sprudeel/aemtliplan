import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { organization } from "better-auth/plugins/organization";
import { sendMail } from "./mail";
import { midataConfig } from "./midata";
import prisma from "./prisma";

const appUrl = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * Accounts, sessions, password reset, email verification, MiData login and
 * plans (= better-auth organizations) with their roles and invitations.
 * Mounted at /api/auth/** (server/api/auth/[...all].ts).
 */
export const auth = betterAuth({
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Brute-force protection on login/sign-up. Only the API tests turn it off.
  rateLimit: { enabled: process.env.AUTH_RATE_LIMIT !== "off" },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true",
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Ämtliplan: Passwort zurücksetzen",
        text: `Hallo ${user.name}\n\nSetze dein Passwort hier zurück:\n${url}\n\nDer Link ist 1 Stunde gültig.`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Ämtliplan: E-Mail bestätigen",
        text: `Hallo ${user.name}\n\nBestätige deine E-Mail-Adresse:\n${url}`,
      });
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      // Only the real owner of the invited address may join a plan.
      requireEmailVerificationOnInvitation: true,
      // Plan = organization. Renamed tables so they read as plans in the DB.
      schema: {
        organization: { modelName: "plan" },
        member: { modelName: "planMembership" },
        invitation: { modelName: "planInvitation" },
      },
      sendInvitationEmail: async ({ id, email, organization: plan, inviter }) => {
        await sendMail({
          to: email,
          subject: `Ämtliplan: Einladung zu ${plan.name}`,
          text: `${inviter.user.name} lädt dich zum Ämtliplan "${plan.name}" ein:\n${appUrl}/invitations/${id}`,
        });
      },
    }),
    genericOAuth({ config: midataConfig ? [midataConfig] : [] }),
  ],
});

export type Session = typeof auth.$Infer.Session;
