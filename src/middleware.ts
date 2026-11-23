import { NextResponse, type NextRequest } from "next/server";
import { auth, authConfigured } from "@/auth";

const gated = authConfigured
  ? auth((req) => {
      if (req.auth) return NextResponse.next();
      const target = req.nextUrl.pathname + req.nextUrl.search;
      const url = new URL("/signin", req.nextUrl.origin);
      url.searchParams.set("callbackUrl", target);
      return NextResponse.redirect(url);
    })
  : function middleware(_req: NextRequest) {
      void _req;
      return NextResponse.next();
    };

export default gated;

export const config = {
  matcher: [
    "/setup/:path*",
    "/interview/:path*",
    "/problems/:path*",
    "/progress/:path*",
    "/system-design/:path*",
  ],
};
