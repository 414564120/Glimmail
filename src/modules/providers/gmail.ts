import crypto from "node:crypto";

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function buildAuthorizationUrl(
  state: string,
  redirectUri: string,
): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not set");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed`);
  }

  return response.json() as Promise<TokenResponse>;
}

interface GoogleUserInfo {
  email: string;
  email_verified?: boolean;
}

export async function getGmailProfile(
  accessToken: string,
  idToken?: string,
): Promise<{ emailAddress: string }> {
  const idTokenEmail = idToken ? getEmailFromIdToken(idToken) : null;
  if (idTokenEmail) {
    return { emailAddress: idTokenEmail };
  }

  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Gmail profile fetch failed`);
  }

  const profile = (await response.json()) as GoogleUserInfo;

  if (!profile.email) {
    throw new Error(`Google profile email missing`);
  }

  return { emailAddress: profile.email.toLowerCase() };
}

export async function testGmailConnection(
  accessToken: string,
): Promise<{ success: true } | { error: "token_expired" | "connection_failed" }> {
  const response = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    if (response.status === 401) {
      return { error: "token_expired" };
    }
    return { error: "connection_failed" };
  }

  return { success: true };
}

function getEmailFromIdToken(idToken: string): string | null {
  const parts = idToken.split(".");
  if (parts.length < 2 || !parts[1]) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { email?: string };
    return payload.email ? payload.email.toLowerCase() : null;
  } catch {
    return null;
  }
}

function base64UrlDecode(value: string): string {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}
