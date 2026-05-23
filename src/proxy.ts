import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/modules/auth/constants";

const protectedRoutes = ["/inbox", "/mailboxes"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && hasSession) {
    const inboxUrl = request.nextUrl.clone();
    inboxUrl.pathname = "/inbox";
    inboxUrl.search = "";

    return NextResponse.redirect(inboxUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/inbox/:path*", "/mailboxes/:path*"],
};
