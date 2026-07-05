import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic auth redirects based on the tc_auth cookie flag (set by the auth
 * store). Real session validation happens client-side against the JWT — this
 * only spares unauthenticated visitors a flash of protected UI.
 */
export function proxy(request: NextRequest) {
  const authed = request.cookies.has("tc_auth");
  const { pathname } = request.nextUrl;

  if (!authed && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (authed && pathname === "/login") {
    return NextResponse.redirect(new URL("/tasks", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/tasks/:path*", "/annotate/:path*", "/login"],
};
