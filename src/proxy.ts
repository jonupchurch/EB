import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Redirects an unauthenticated /admin/* request to sign-in with a
// callbackUrl pointing back to the page actually requested — without
// this, Auth.js falls back to its default post-login redirect (the
// site root), landing the admin on the homepage instead of where they
// were headed. The layout-level session/allow-list check
// (src/app/admin/layout.tsx) remains as defense in depth.
export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && !req.auth) {
    const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
