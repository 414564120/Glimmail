import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/modules/auth";
import {
  buildAuthorizationUrl,
  generateOAuthState,
} from "@/modules/providers/gmail";

const STATE_COOKIE = "gmail_oauth_state";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/mailboxes/connect?provider=gmail", request.url),
    );
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL(
        "/mailboxes/connect?provider=gmail&error=" +
          encodeURIComponent("Google OAuth is not configured."),
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
  const configured = process.env.GOOGLE_REDIRECT_URI;
  if (configured) return configured;

  const { protocol, host } = request.nextUrl;
  return `${protocol}//${host}/api/auth/gmail/callback`;
}
