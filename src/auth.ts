import NextAuth, { type NextAuthResult } from "next-auth";
import GitHub from "next-auth/providers/github";
import { NextResponse, type NextRequest } from "next/server";

export const authConfigured = Boolean(
  process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET && process.env.AUTH_SECRET
);

async function unconfiguredGET(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith("/session")) return NextResponse.json(null);
  if (req.nextUrl.pathname.endsWith("/providers")) return NextResponse.json({});
  return NextResponse.json({ error: "Auth is not configured" }, { status: 404 });
}

async function unconfiguredPOST() {
  return NextResponse.json({ error: "Auth is not configured" }, { status: 404 });
}

const configured: NextAuthResult | null = authConfigured
  ? NextAuth({
      providers: [GitHub],
      session: { strategy: "jwt" },
      callbacks: {
        jwt({ token, account, profile }) {
          if (account?.providerAccountId) token.userId = account.providerAccountId;
          else if (profile && typeof profile === "object" && "id" in profile) {
            token.userId = String((profile as { id: unknown }).id);
          }
          return token;
        },
        session({ session, token }) {
          const uid = (token as { userId?: unknown }).userId;
          if (session.user) session.user.id = typeof uid === "string" ? uid : token.sub ?? "";
          return session;
        },
      },
    })
  : null;

export const handlers: NextAuthResult["handlers"] = configured
  ? configured.handlers
  : { GET: unconfiguredGET, POST: unconfiguredPOST };

export const auth: NextAuthResult["auth"] = configured
  ? configured.auth
  : ((async () => null) as unknown as NextAuthResult["auth"]);

export const signIn: NextAuthResult["signIn"] = configured
  ? configured.signIn
  : ((async () => undefined) as unknown as NextAuthResult["signIn"]);

export const signOut: NextAuthResult["signOut"] = configured
  ? configured.signOut
  : ((async () => undefined) as unknown as NextAuthResult["signOut"]);
