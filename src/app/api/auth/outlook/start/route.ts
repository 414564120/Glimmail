import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/modules/auth";
import {
  buildAuthorizationUrl,
  generateOAuthState,
} from "@/modules/providers/outlook";

const STATE_COOKIE = "outlook_oauth_state";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/mailboxes/connect?provider=outlook", request.url),
    );
  }

  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL(
        "/mailboxes/connect?provider=outlook&error=" +
          encodeURIComponent("Microsoft OAuth is not configured."),
        request.url,
      ),
    );
  }

  const state = generateOAuthState();
  const redirectUri = getRedirectUri(request);
  const authorizationUrl = buildAuthorizationUrl(state, redirectUri);
  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set(STATE_COOKIE, `${state}:${user.id}`, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

function getRedirectUri(request: NextRequest): string {
  const configured = process.env.MICROSOFT_REDIRECT_URI;
  if (configured) return configured;

  const { protocol, host } = request.nextUrl;
  return `${protocol}//${host}/api/auth/outlook/callback`;
}
