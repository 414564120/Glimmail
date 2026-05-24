import crypto from "node:crypto";

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function buildAuthorizationUrl(
  state: string,
  redirectUri: string,
): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error("MICROSOFT_CLIENT_ID is not set");

  const scopes = ["openid", "profile", "email", "offline_access", "User.Read"];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    response_mode: "query",
    state,
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
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
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth credentials not configured");
  }

  const response = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Microsoft token exchange failed");
  }

  return response.json() as Promise<TokenResponse>;
}

export async function getOutlookProfile(
  accessToken: string,
  idToken?: string,
): Promise<{ emailAddress: string }> {
  // Prefer id_token email claim (no network call needed)
  const idTokenEmail = idToken ? getEmailFromIdToken(idToken) : null;
  if (idTokenEmail) {
    return { emailAddress: idTokenEmail };
  }

  // Fallback: Microsoft Graph /me
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Microsoft Graph /me request failed");
  }

  const profile = (await response.json()) as {
    mail?: string;
    userPrincipalName?: string;
  };

  const email = profile.mail?.toLowerCase() ?? profile.userPrincipalName?.toLowerCase();
  if (!email) {
    throw new Error("Microsoft profile email missing");
  }

  return { emailAddress: email };
}

function getEmailFromIdToken(idToken: string): string | null {
  const parts = idToken.split(".");
  if (parts.length < 2 || !parts[1]) return null;

  try {
    const payload = JSON.parse(
      base64UrlDecode(parts[1]),
    ) as { email?: string; preferred_username?: string; upn?: string };
    const email = payload.email ?? payload.preferred_username ?? payload.upn;
    return email ? email.toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function testOutlookConnection(
  accessToken: string,
): Promise<{ success: true } | { error: "token_expired" | "connection_failed" }> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      return { error: "token_expired" };
    }
    return { error: "connection_failed" };
  }

  return { success: true };
}

interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

export async function refreshOutlookToken(
  refreshToken: string,
): Promise<RefreshTokenResponse> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth credentials not configured");
  }

  const response = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Microsoft token refresh failed");
  }

  return response.json() as Promise<RefreshTokenResponse>;
}

function base64UrlDecode(value: string): string {
  const padded = value.padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "=",
  );
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}
