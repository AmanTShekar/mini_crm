import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@stay.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Property Admin";

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing NEXTAUTH_SECRET. Copy .env.example to .env (local) or set env vars on Vercel (see README).",
    );
  }
  console.warn("[auth] NEXTAUTH_SECRET missing — dev-only fallback in use. Set it in .env.");
  return "dev-only-insecure-secret-set-NEXTAUTH_SECRET-in-prod";
}

export const authOptions: NextAuthOptions = {
  secret: getSecret(),
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
          credentials?.password === ADMIN_PASSWORD
        ) {
          return { id: "admin-1", name: ADMIN_NAME, email: ADMIN_EMAIL };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = (token.name as string) ?? ADMIN_NAME;
        session.user.email = (token.email as string) ?? ADMIN_EMAIL;
      }
      return session;
    },
  },
};
