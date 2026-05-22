import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/modules/auth/session";

const protectedRoutes = ["/inbox", "/mailboxes"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await verifySessionToken(token);

  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && user) {
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
