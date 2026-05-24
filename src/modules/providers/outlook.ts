import crypto from "node:crypto";
import { decodeRfc2047 } from "./rfc2047";

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function buildAuthorizationUrl(
  state: string,
  redirectUri: string,
  options: { requestMailRead?: boolean } = {},
): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error("MICROSOFT_CLIENT_ID is not set");

  const scopes = ["openid", "profile", "email", "offline_access", "User.Read"];
  if (options.requestMailRead) {
    scopes.push(MAIL_READ_SCOPE);
  }

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

const MAIL_READ_SCOPE = "https://graph.microsoft.com/Mail.Read";

export function hasMailReadScope(scope: string | undefined): boolean {
  if (!scope) return false;
  const scopes = scope.split(/\s+/);
  return scopes.includes(MAIL_READ_SCOPE) || scopes.includes("Mail.Read");
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

// -- Outlook Graph API sync --------------------------------------------------

export interface OutlookMessageEntry {
  id: string;
  subject: string;
  from: { emailAddress: { name?: string; address: string } };
  receivedDateTime: string;
  bodyPreview: string;
  body: { contentType: string; content: string };
  internetMessageId: string;
  conversationId: string;
}

interface OutlookListResponse {
  value: OutlookMessageEntry[];
}

export async function listOutlookMessages(
  accessToken: string,
  maxResults = 10,
): Promise<OutlookMessageEntry[]> {
  const params = new URLSearchParams({
    $top: String(maxResults),
    $orderby: "receivedDateTime desc",
    $select: "id,subject,from,receivedDateTime,bodyPreview,body,internetMessageId,conversationId",
  });

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw await createOutlookApiError(response, "Outlook list failed");
  }

  const data = (await response.json()) as OutlookListResponse;
  return data.value ?? [];
}

export interface OutlookSyncedMessage {
  messageId: string;
  threadId: string;
  sender: string;
  subject: string;
  bodyText: string;
  preview: string;
  receivedAt: Date;
}

export function parseOutlookMessage(
  entry: OutlookMessageEntry,
): OutlookSyncedMessage {
  const from = entry.from?.emailAddress;
  const sender = from?.name || from?.address || "unknown";
  const subject = decodeRfc2047(entry.subject ?? "") || "(no subject)";
  const bodyText =
    entry.body?.contentType === "html"
      ? stripHtml(entry.body.content)
      : (entry.body?.content ?? "");
  const preview = entry.bodyPreview ?? "";

  return {
    messageId: entry.id,
    threadId: entry.conversationId ?? "",
    sender,
    subject,
    bodyText,
    preview,
    receivedAt: new Date(entry.receivedDateTime),
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type OutlookApiErrorCode =
  | "outlook_token_expired"
  | "outlook_insufficient_scope"
  | "outlook_api_failed";

export class OutlookApiError extends Error {
  constructor(readonly code: OutlookApiErrorCode) {
    super(code);
    this.name = "OutlookApiError";
  }
}

export function isOutlookApiError(
  error: unknown,
): error is OutlookApiError {
  return error instanceof OutlookApiError;
}

async function createOutlookApiError(
  response: Response,
  fallback: string,
): Promise<Error> {
  if (response.status === 401) {
    return new OutlookApiError("outlook_token_expired");
  }
  if (response.status === 403) {
    return new OutlookApiError("outlook_insufficient_scope");
  }
  return new Error(fallback);
}
