/**
 * Lightweight unit tests for Outlook provider parsing functions.
 * Run with: tsx src/modules/providers/outlook.test.ts
 */

import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  getOutlookProfile,
  parseOutlookMessage,
  hasMailReadScope,
  isOutlookApiError,
  listOutlookMessages,
  refreshOutlookToken,
  type OutlookMessageEntry,
} from "./outlook";
import { formatRateLimitMessage } from "./rate-limit";

let passed = 0;
let failed = 0;
const originalFetch = globalThis.fetch;
const originalMicrosoftClientId = process.env.MICROSOFT_CLIENT_ID;
const originalMicrosoftClientSecret = process.env.MICROSOFT_CLIENT_SECRET;
const microsoftTokenEndpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const testRedirectUri = "https://app.example.test/api/auth/outlook/callback";

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function assertEq<T>(actual: T, expected: T, label: string) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
    console.error(`    expected: ${JSON.stringify(expected)}`);
    console.error(`    actual:   ${JSON.stringify(actual)}`);
  }
}

function makeEntry(overrides: Partial<OutlookMessageEntry> = {}): OutlookMessageEntry {
  return {
    id: "msg-001",
    subject: "Hello World",
    from: {
      emailAddress: { name: "Alice", address: "alice@example.com" },
    },
    receivedDateTime: "2025-06-15T10:30:00Z",
    bodyPreview: "This is a preview",
    body: { contentType: "text", content: "Plain text body" },
    internetMessageId: "<abc123@graph.microsoft.com>",
    conversationId: "conv-001",
    ...overrides,
  };
}

function getAuthorizationHeader(headers: HeadersInit | undefined): string {
  return getHeader(headers, "Authorization");
}

function getHeader(headers: HeadersInit | undefined, expectedName: string): string {
  if (!headers) return "";
  if (headers instanceof Headers) return headers.get(expectedName) ?? "";
  const lowerExpectedName = expectedName.toLowerCase();
  if (Array.isArray(headers)) {
    return headers.find(([name]) => name.toLowerCase() === lowerExpectedName)?.[1] ?? "";
  }
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === lowerExpectedName) return value;
  }
  return "";
}

function getFormBody(body: BodyInit | null | undefined): URLSearchParams {
  if (body instanceof URLSearchParams) return body;
  return new URLSearchParams(String(body ?? ""));
}

function setMicrosoftCredentials() {
  process.env.MICROSOFT_CLIENT_ID = "test-client-id";
  process.env.MICROSOFT_CLIENT_SECRET = "test-client-secret";
}

function clearMicrosoftCredentials() {
  delete process.env.MICROSOFT_CLIENT_ID;
  delete process.env.MICROSOFT_CLIENT_SECRET;
}

interface CapturedFormRequest {
  url: string;
  method: string;
  contentType: string;
  body: URLSearchParams;
}

function mockTokenEndpoint(
  responseBody: Record<string, unknown>,
  options: { status?: number; body?: string } = {},
): CapturedFormRequest {
  const request: CapturedFormRequest = {
    url: "",
    method: "",
    contentType: "",
    body: new URLSearchParams(),
  };

  globalThis.fetch = async (input, init) => {
    request.url = String(input);
    request.method = init?.method ?? "";
    request.contentType = getHeader(init?.headers, "Content-Type");
    request.body = getFormBody(init?.body);

    return new Response(
      options.body ?? JSON.stringify(responseBody),
      {
        status: options.status ?? 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  return request;
}

function assertTokenEndpointRequest(
  request: CapturedFormRequest,
  labelPrefix: string,
) {
  assertEq(
    request.url,
    microsoftTokenEndpoint,
    `${labelPrefix} targets Microsoft v2 token endpoint`,
  );
  assertEq(request.method, "POST", `${labelPrefix} uses POST`);
  assertEq(
    request.contentType,
    "application/x-www-form-urlencoded",
    `${labelPrefix} sends form content type`,
  );
}

function assertFormFields(
  body: URLSearchParams,
  expected: Record<string, string>,
  labelPrefix: string,
) {
  for (const [name, value] of Object.entries(expected)) {
    assertEq(body.get(name), value, `${labelPrefix} sends ${name}`);
  }
}

async function assertRejectsWithMessage(
  action: () => Promise<unknown>,
  expectedMessage: string,
  label: string,
): Promise<string> {
  try {
    await action();
    assert(false, `${label}: expected rejection`);
    return "";
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    assertEq(message, expectedMessage, label);
    return message;
  }
}

function makeIdToken(payload: Record<string, unknown>): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload))
    .toString("base64url");
  return `header.${encodedPayload}.signature`;
}

// -- parseOutlookMessage ----------------------------------------------------

console.log("parseOutlookMessage");

// HTML body is stripped
{
  const entry = makeEntry({
    body: {
      contentType: "html",
      content: "<html><body><p>Hello <b>World</b></p></body></html>",
    },
  });
  const parsed = parseOutlookMessage(entry);
  assertEq(
    parsed.bodyText.includes("Hello World"),
    true,
    "HTML body is stripped of tags",
  );
  assert(
    !parsed.bodyText.includes("<b>"),
    "HTML body has no tags remaining",
  );
}

// HTML entities are decoded
{
  const entry = makeEntry({
    body: {
      contentType: "html",
      content: "&amp; &lt; &gt; &quot; &#x27; &#64;",
    },
  });
  const parsed = parseOutlookMessage(entry);
  assertEq(parsed.bodyText, '& < > " \' @', "HTML entities are decoded");
}

// Plain text body is preserved
{
  const entry = makeEntry({
    body: { contentType: "text", content: "Just plain text.\nLine two." },
  });
  const parsed = parseOutlookMessage(entry);
  assertEq(parsed.bodyText, "Just plain text.\nLine two.", "Plain text body preserved");
}

// Sender uses from.emailAddress.name
{
  const entry = makeEntry({
    from: { emailAddress: { name: "Bob", address: "bob@test.com" } },
  });
  const parsed = parseOutlookMessage(entry);
  assertEq(parsed.sender, "Bob", "Sender uses name");
}

// Sender falls back to address when name is missing
{
  const entry = makeEntry({
    from: { emailAddress: { address: "charlie@test.com" } },
  });
  const parsed = parseOutlookMessage(entry);
  assertEq(parsed.sender, "charlie@test.com", "Sender falls back to address");
}

// Sender falls back to "unknown" when both name and address are empty
{
  const entry = makeEntry({
    from: { emailAddress: { name: "", address: "" } },
  });
  const parsed = parseOutlookMessage(entry);
  assertEq(parsed.sender, "unknown", "Empty sender falls back to 'unknown'");
}

// Subject falls back to "(no subject)"
{
  const entry = makeEntry({ subject: "" });
  const parsed = parseOutlookMessage(entry);
  assertEq(parsed.subject, "(no subject)", "Empty subject fallback");
}

// RFC 2047 subject is decoded
{
  const entry = makeEntry({ subject: "=?UTF-8?B?5rWL6K+V?=" });
  const parsed = parseOutlookMessage(entry);
  assertEq(parsed.subject, "测试", "RFC 2047 B-encoded subject");
}

// bodyPreview is used as preview
{
  const entry = makeEntry({ bodyPreview: "Short preview text" });
  const parsed = parseOutlookMessage(entry);
  assertEq(parsed.preview, "Short preview text", "bodyPreview maps to preview");
}

// conversationId maps to threadId
{
  const entry = makeEntry({ conversationId: "conv-abc" });
  const parsed = parseOutlookMessage(entry);
  assertEq(parsed.threadId, "conv-abc", "conversationId maps to threadId");
}

// Empty conversationId maps to empty threadId
{
  const entry = makeEntry({ conversationId: "" });
  const parsed = parseOutlookMessage(entry);
  assertEq(parsed.threadId, "", "Empty conversationId maps to empty threadId");
}

// messageId and receivedAt pass through
{
  const entry = makeEntry({ id: "msg-42", receivedDateTime: "2025-01-01T00:00:00Z" });
  const parsed = parseOutlookMessage(entry);
  assertEq(parsed.messageId, "msg-42", "messageId passes through");
  assertEq(parsed.receivedAt.toISOString(), "2025-01-01T00:00:00.000Z", "receivedAt is parsed");
}

// -- hasMailReadScope -------------------------------------------------------

console.log("\nhasMailReadScope");

assert(
  hasMailReadScope("openid profile https://graph.microsoft.com/Mail.Read"),
  "Full URI Mail.Read scope is recognized",
);

assert(
  hasMailReadScope("openid profile Mail.Read offline_access"),
  "Short Mail.Read scope is recognized",
);

assertEq(
  hasMailReadScope(undefined),
  false,
  "Undefined scope returns false",
);

assertEq(
  hasMailReadScope("openid profile email"),
  false,
  "Scope without Mail.Read returns false",
);

// -- buildAuthorizationUrl --------------------------------------------------

console.log("\nbuildAuthorizationUrl");

{
  process.env.MICROSOFT_CLIENT_ID = "outlook-client-id";
  const url = new URL(
    buildAuthorizationUrl(
      "state-123",
      "http://localhost:3000/api/auth/outlook/callback",
    ),
  );
  const scopes = url.searchParams.get("scope")?.split(" ") ?? [];

  assertEq(
    `${url.origin}${url.pathname}`,
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "Authorization URL targets Microsoft v2 authorize endpoint",
  );
  assertEq(
    url.searchParams.get("client_id"),
    "outlook-client-id",
    "Authorization URL includes client id",
  );
  assertEq(
    url.searchParams.get("redirect_uri"),
    "http://localhost:3000/api/auth/outlook/callback",
    "Authorization URL includes redirect URI",
  );
  assertEq(
    url.searchParams.get("response_type"),
    "code",
    "Authorization URL requests authorization code",
  );
  assertEq(
    url.searchParams.get("response_mode"),
    "query",
    "Authorization URL uses query response mode",
  );
  assertEq(url.searchParams.get("state"), "state-123", "Authorization URL includes state");

  for (const scope of ["openid", "profile", "email", "offline_access", "User.Read"]) {
    assert(scopes.includes(scope), `Default authorization includes ${scope}`);
  }
  assertEq(
    scopes.includes("https://graph.microsoft.com/Mail.Read"),
    false,
    "Default authorization does not request Mail.Read",
  );
}

{
  process.env.MICROSOFT_CLIENT_ID = "outlook-client-id";
  const url = new URL(
    buildAuthorizationUrl(
      "state-456",
      "http://localhost:3000/api/auth/outlook/callback",
      { requestMailRead: true },
    ),
  );
  const scopes = url.searchParams.get("scope")?.split(" ") ?? [];

  assert(
    scopes.includes("https://graph.microsoft.com/Mail.Read"),
    "Mail sync authorization requests Mail.Read",
  );
}

{
  delete process.env.MICROSOFT_CLIENT_ID;

  try {
    buildAuthorizationUrl(
      "state-789",
      "http://localhost:3000/api/auth/outlook/callback",
    );
    assert(false, "Missing client id should throw");
  } catch (error) {
    assertEq(
      error instanceof Error ? error.message : "",
      "MICROSOFT_CLIENT_ID is not set",
      "Missing client id throws safe configuration error",
    );
  }
}

// -- getOutlookProfile ------------------------------------------------------

console.log("\ngetOutlookProfile");

async function assertRejectsSafeProfileError(
  response: Response,
  expectedMessage: string,
  label: string,
) {
  globalThis.fetch = async () => response;

  try {
    await getOutlookProfile("redacted-access-token", "malformed-token");
  } catch (error) {
    assertEq(
      error instanceof Error ? error.message : "",
      expectedMessage,
      label,
    );
    return;
  }

  assert(false, `${label}: expected getOutlookProfile to throw`);
}

// -- listOutlookMessages ----------------------------------------------------

console.log("\nlistOutlookMessages");

async function assertRejectsOutlookApiError(
  status: number,
  expectedCode: string,
  label: string,
) {
  globalThis.fetch = async () =>
    new Response("{}", {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    await listOutlookMessages("redacted-access-token", 10);
  } catch (error) {
    assert(
      isOutlookApiError(error) && error.code === expectedCode,
      label,
    );
    return;
  }

  assert(false, `${label}: expected listOutlookMessages to throw`);
}

async function runAsyncTests() {
  console.log("\nexchangeCodeForTokens");

  clearMicrosoftCredentials();
  globalThis.fetch = async () => {
    throw new Error("fetch should not be called without Microsoft credentials");
  };
  await assertRejectsWithMessage(
    () => exchangeCodeForTokens("redacted-authorization-code", testRedirectUri),
    "Microsoft OAuth credentials not configured",
    "Token exchange without credentials throws safe configuration error",
  );

  process.env.MICROSOFT_CLIENT_ID = "test-client-id";
  delete process.env.MICROSOFT_CLIENT_SECRET;
  await assertRejectsWithMessage(
    () => exchangeCodeForTokens("redacted-authorization-code", testRedirectUri),
    "Microsoft OAuth credentials not configured",
    "Token exchange without client secret throws safe configuration error",
  );

  setMicrosoftCredentials();

  {
    const request = mockTokenEndpoint({
      access_token: "redacted-access-token",
      refresh_token: "redacted-refresh-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "openid profile email",
    });
    const tokens = await exchangeCodeForTokens(
      "redacted-authorization-code",
      testRedirectUri,
    );

    assertTokenEndpointRequest(request, "Token exchange");
    assertFormFields(
      request.body,
      {
        code: "redacted-authorization-code",
        client_id: "test-client-id",
        client_secret: "test-client-secret",
        redirect_uri: testRedirectUri,
        grant_type: "authorization_code",
      },
      "Token exchange",
    );
    assertEq(
      tokens.access_token,
      "redacted-access-token",
      "Token exchange returns parsed token response",
    );
  }

  mockTokenEndpoint({}, { status: 400, body: "raw upstream token exchange body" });
  const exchangeFailureMessage = await assertRejectsWithMessage(
    () => exchangeCodeForTokens("redacted-authorization-code", testRedirectUri),
    "Microsoft token exchange failed",
    "Token exchange failure throws fixed safe message",
  );
  assert(
    !exchangeFailureMessage.includes("raw upstream token exchange body"),
    "Token exchange failure does not leak upstream body",
  );

  console.log("\nrefreshOutlookToken");

  process.env.MICROSOFT_CLIENT_ID = "test-client-id";
  delete process.env.MICROSOFT_CLIENT_SECRET;
  globalThis.fetch = async () => {
    throw new Error("fetch should not be called without Microsoft credentials");
  };
  await assertRejectsWithMessage(
    () => refreshOutlookToken("redacted-refresh-token"),
    "Microsoft OAuth credentials not configured",
    "Token refresh without credentials throws safe configuration error",
  );

  delete process.env.MICROSOFT_CLIENT_ID;
  process.env.MICROSOFT_CLIENT_SECRET = "test-client-secret";
  await assertRejectsWithMessage(
    () => refreshOutlookToken("redacted-refresh-token"),
    "Microsoft OAuth credentials not configured",
    "Token refresh without client id throws safe configuration error",
  );

  setMicrosoftCredentials();

  {
    const request = mockTokenEndpoint({
      access_token: "redacted-access-token",
      refresh_token: "redacted-new-refresh-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "openid profile email",
    });
    const tokens = await refreshOutlookToken("redacted-refresh-token");

    assertTokenEndpointRequest(request, "Token refresh");
    assertFormFields(
      request.body,
      {
        client_id: "test-client-id",
        client_secret: "test-client-secret",
        refresh_token: "redacted-refresh-token",
        grant_type: "refresh_token",
      },
      "Token refresh",
    );
    assertEq(
      tokens.access_token,
      "redacted-access-token",
      "Token refresh returns parsed token response",
    );
  }

  mockTokenEndpoint({}, { status: 400, body: "raw upstream token refresh body" });
  const refreshFailureMessage = await assertRejectsWithMessage(
    () => refreshOutlookToken("redacted-refresh-token"),
    "Microsoft token refresh failed",
    "Token refresh failure throws fixed safe message",
  );
  assert(
    !refreshFailureMessage.includes("raw upstream token refresh body"),
    "Token refresh failure does not leak upstream body",
  );

  let fetchCalls = 0;

  globalThis.fetch = async () => {
    fetchCalls++;
    throw new Error("fetch should not be called for id_token profile");
  };

  const idTokenEmailProfile = await getOutlookProfile(
    "redacted-access-token",
    makeIdToken({ email: "USER@Example.COM" }),
  );
  assertEq(
    idTokenEmailProfile.emailAddress,
    "user@example.com",
    "id_token email claim is lowercased",
  );
  assertEq(fetchCalls, 0, "id_token email avoids Graph /me request");

  const preferredUsernameProfile = await getOutlookProfile(
    "redacted-access-token",
    makeIdToken({ preferred_username: "ALIAS@Example.COM" }),
  );
  assertEq(
    preferredUsernameProfile.emailAddress,
    "alias@example.com",
    "id_token preferred_username fallback is lowercased",
  );

  let requestedProfileUrl = "";
  let profileAuthorizationHeader = "";

  globalThis.fetch = async (input, init) => {
    requestedProfileUrl = String(input);
    profileAuthorizationHeader = getAuthorizationHeader(init?.headers);

    return new Response(JSON.stringify({ mail: "MAIL@Example.COM" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const graphMailProfile = await getOutlookProfile(
    "redacted-access-token",
    "malformed-token",
  );
  assertEq(
    graphMailProfile.emailAddress,
    "mail@example.com",
    "Malformed id_token falls back to Graph /me mail",
  );
  assertEq(
    requestedProfileUrl,
    "https://graph.microsoft.com/v1.0/me",
    "Graph profile fallback targets /me",
  );
  assertEq(
    profileAuthorizationHeader,
    "Bearer redacted-access-token",
    "Graph profile fallback sends bearer authorization header",
  );

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ userPrincipalName: "UPN@Example.COM" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const userPrincipalNameProfile = await getOutlookProfile(
    "redacted-access-token",
    "malformed-token",
  );
  assertEq(
    userPrincipalNameProfile.emailAddress,
    "upn@example.com",
    "Graph /me userPrincipalName fallback is lowercased",
  );

  await assertRejectsSafeProfileError(
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
    "Microsoft profile email missing",
    "Missing Graph profile email throws safe error",
  );

  await assertRejectsSafeProfileError(
    new Response("raw graph error body", { status: 500 }),
    "Microsoft Graph /me request failed",
    "Graph profile failure throws safe error",
  );

  let requestedUrl = "";
  let authorizationHeader = "";

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    authorizationHeader = getAuthorizationHeader(init?.headers);

    return new Response(JSON.stringify({ value: [makeEntry({ id: "msg-99" })] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const messages = await listOutlookMessages("redacted-access-token", 10);
  const url = new URL(requestedUrl);

  assertEq(messages.length, 1, "List response value is returned");
  assertEq(messages[0]?.id, "msg-99", "List response message id is preserved");
  assertEq(
    `${url.origin}${url.pathname}`,
    "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages",
    "Graph call targets inbox messages only",
  );
  assertEq(url.searchParams.get("$top"), "10", "Graph call limits to 10 messages");
  assertEq(
    url.searchParams.get("$orderby"),
    "receivedDateTime desc",
    "Graph call orders newest first",
  );
  assertEq(
    url.searchParams.get("$select"),
    "id,subject,from,receivedDateTime,bodyPreview,body,internetMessageId,conversationId",
    "Graph call selects only expected message fields",
  );
  assertEq(
    url.searchParams.has("$expand"),
    false,
    "Graph call does not request attachments",
  );
  assertEq(
    authorizationHeader,
    "Bearer redacted-access-token",
    "Graph call sends bearer authorization header",
  );

  await assertRejectsOutlookApiError(
    401,
    "outlook_token_expired",
    "401 maps to token expired",
  );
  await assertRejectsOutlookApiError(
    403,
    "outlook_insufficient_scope",
    "403 maps to insufficient scope",
  );
  await assertRejectsOutlookApiError(
    429,
    "outlook_rate_limited",
    "429 maps to rate limited without Retry-After",
  );
  assertEq(
    formatRateLimitMessage("Outlook", null),
    "Outlook sync is temporarily rate limited. Please try again later.",
    "Outlook rate-limit fallback message is safe without Retry-After",
  );

  globalThis.fetch = async () =>
    new Response("raw Graph throttling body with token-like details", {
      status: 429,
      headers: { "Retry-After": "17" },
    });

  let sawRateLimitError = false;
  try {
    await listOutlookMessages("redacted-access-token", 10);
  } catch (error) {
    sawRateLimitError = true;
    assert(
      isOutlookApiError(error) && error.code === "outlook_rate_limited",
      "429 maps to rate limited",
    );
    assertEq(
      isOutlookApiError(error) ? error.message : "",
      "outlook_rate_limited",
      "429 error message is fixed and safe",
    );
    assertEq(
      isOutlookApiError(error) ? error.retryAfterSeconds : null,
      17,
      "429 captures Retry-After seconds",
    );

    const safeMessage = formatRateLimitMessage(
      "Outlook",
      isOutlookApiError(error) ? error.retryAfterSeconds : null,
    );
    assert(
      safeMessage.includes("about 17 seconds"),
      "Outlook safe rate-limit message uses Retry-After seconds",
    );
    assert(
      !safeMessage.includes("raw Graph"),
      "Outlook safe rate-limit message does not leak upstream body",
    );
  }
  assert(sawRateLimitError, "429 response throws a rate-limit error");

  globalThis.fetch = async () => new Response("{}", { status: 500 });

  try {
    await listOutlookMessages("redacted-access-token", 10);
  } catch (error) {
    assert(
      error instanceof Error &&
        !isOutlookApiError(error) &&
        error.message === "Outlook list failed",
      "Non-Graph auth error uses safe fallback message",
    );
    return;
  }

  assert(false, "Expected 500 response to throw");
}

// -- Summary ----------------------------------------------------------------

runAsyncTests()
  .catch((error) => {
    failed++;
    console.error("  FAIL: async Outlook provider tests");
    console.error(error);
  })
  .finally(() => {
    globalThis.fetch = originalFetch;
    if (originalMicrosoftClientId === undefined) {
      delete process.env.MICROSOFT_CLIENT_ID;
    } else {
      process.env.MICROSOFT_CLIENT_ID = originalMicrosoftClientId;
    }
    if (originalMicrosoftClientSecret === undefined) {
      delete process.env.MICROSOFT_CLIENT_SECRET;
    } else {
      process.env.MICROSOFT_CLIENT_SECRET = originalMicrosoftClientSecret;
    }

    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) {
      console.error("SOME TESTS FAILED");
      process.exit(1);
    } else {
      console.log("All tests passed.");
    }
  });
