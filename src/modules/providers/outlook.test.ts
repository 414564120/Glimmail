/**
 * Lightweight unit tests for Outlook provider parsing functions.
 * Run with: tsx src/modules/providers/outlook.test.ts
 */

import {
  buildAuthorizationUrl,
  parseOutlookMessage,
  hasMailReadScope,
  isOutlookApiError,
  listOutlookMessages,
  type OutlookMessageEntry,
} from "./outlook";

let passed = 0;
let failed = 0;
const originalFetch = globalThis.fetch;
const originalMicrosoftClientId = process.env.MICROSOFT_CLIENT_ID;

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
  if (!headers) return "";
  if (headers instanceof Headers) return headers.get("Authorization") ?? "";
  if (Array.isArray(headers)) {
    return headers.find(([name]) => name === "Authorization")?.[1] ?? "";
  }
  return headers.Authorization ?? "";
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
    process.env.MICROSOFT_CLIENT_ID = originalMicrosoftClientId;

    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed > 0) {
      console.error("SOME TESTS FAILED");
      process.exit(1);
    } else {
      console.log("All tests passed.");
    }
  });
