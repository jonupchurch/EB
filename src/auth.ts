import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// Restricted to a fixed, pre-authorized set of accounts (Constitution
// Principle IV: single owner role, no general-purpose accounts) —
// never hardcode the real addresses in source, per ADR-0006.
const allowedEmails = (process.env.ADMIN_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  return !!email && allowedEmails.includes(email.toLowerCase());
}

const providers: Provider[] = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
];

// Test-only sign-in path so Playwright can authenticate deterministically
// as an authorized account without real Google OAuth — matches this
// project's established fake-provider-for-external-dependencies pattern.
// Set only via playwright.config.ts's webServer.env, never in a
// committed .env file, and never active outside that e2e run.
if (process.env.E2E_TEST_AUTH === "true") {
  providers.push(
    Credentials({
      id: "test-login",
      name: "Test Login",
      credentials: {
        email: { label: "Email", type: "text" },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string" ? credentials.email : undefined;
        if (!isAllowedAdminEmail(email)) return null;
        return { id: email as string, email, name: email };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  callbacks: {
    async signIn({ user }) {
      return isAllowedAdminEmail(user.email);
    },
  },
});

/**
 * Shared guard for every admin Server Action (feature 1 and later admin
 * features — e.g. feature 5 reuses this directly): returns the session
 * if it belongs to an authorized account, otherwise null. Defense in
 * depth alongside the signIn callback above — see research.md.
 */
export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user || !isAllowedAdminEmail(session.user.email)) {
    return null;
  }
  return session;
}
