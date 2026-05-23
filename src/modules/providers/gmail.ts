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
    scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
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

interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<RefreshTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Token refresh failed");
  }

  return response.json() as Promise<RefreshTokenResponse>;
}

// -- Gmail API sync --------------------------------------------------------

export interface GmailListEntry {
  id: string;
  threadId: string;
}

interface GmailListResponse {
  messages: GmailListEntry[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export async function listGmailMessages(
  accessToken: string,
  maxResults = 10,
): Promise<GmailListEntry[]> {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  params.append("labelIds", "INBOX");

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("insufficient_scope");
    }
    throw new Error("Gmail list failed");
  }

  const data = (await response.json()) as GmailListResponse;
  return data.messages ?? [];
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessagePart {
  mimeType: string;
  body: { size: number; data?: string };
  parts?: GmailMessagePart[];
}

interface GmailMessageResponse {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  payload: {
    headers: GmailHeader[];
    body: { size: number; data?: string };
    parts?: GmailMessagePart[];
    mimeType?: string;
  };
}

export interface GmailSyncedMessage {
  messageId: string;
  threadId: string;
  sender: string;
  subject: string;
  bodyText: string;
  snippet: string;
  receivedAt: Date;
}

export async function getGmailMessage(
  accessToken: string,
  messageId: string,
): Promise<GmailSyncedMessage> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new Error("Gmail message fetch failed");
  }

  const msg = (await response.json()) as GmailMessageResponse;

  const headers = msg.payload.headers;
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  const sender = getHeader("From").replace(/<[^>]*>/g, "").trim() || "unknown";
  const subject = getHeader("Subject") || "(no subject)";
  const bodyText = extractGmailBody(msg.payload);
  const receivedAt = parseGmailDate(getHeader("Date"), msg.internalDate);

  return {
    messageId: msg.id,
    threadId: msg.threadId,
    sender,
    subject,
    bodyText,
    snippet: msg.snippet ?? "",
    receivedAt,
  };
}

function extractGmailBody(payload: GmailMessageResponse["payload"]): string {
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
      if (part.parts) {
        for (const sub of part.parts) {
          if (sub.mimeType === "text/plain" && sub.body.data) {
            return decodeBase64Url(sub.body.data);
          }
        }
      }
    }
    // Fallback: return first part with data
    for (const part of payload.parts) {
      if (part.body.data) return decodeBase64Url(part.body.data);
    }
    return "";
  }

  if (payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  return "";
}

function decodeBase64Url(data: string): string {
  const padded = data.padEnd(data.length + ((4 - (data.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function parseGmailDate(dateHeader: string, internalDate: string): Date {
  if (dateHeader) {
    const parsed = new Date(dateHeader);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (internalDate) {
    const ms = parseInt(internalDate, 10);
    if (!isNaN(ms)) return new Date(ms);
  }
  return new Date();
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
