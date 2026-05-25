import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  generateOAuthState,
  getGmailProfile,
  getGmailMessage,
  hasGmailReadonlyScope,
  isGmailApiError,
  listGmailMessages,
  refreshAccessToken,
} from "./gmail";
import { formatRateLimitMessage } from "./rate-limit";

type TestFn = () => void | Promise<void>;

let passed = 0;
let failed = 0;

async function test(name: string, fn: TestFn) {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`  FAIL: ${name}`);
    console.error(error);
  }
}

function assertEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const originalClientId = process.env.GOOGLE_CLIENT_ID;
const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const originalFetch = globalThis.fetch;

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function makeIdToken(payload: Record<string, unknown>): string {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

function getAuthorizationHeader(headers: HeadersInit | undefined): string {
  return getHeaderValue(headers, "Authorization");
}

function getHeaderValue(headers: HeadersInit | undefined, headerName: string): string {
  if (!headers) return "";
  if (headers instanceof Headers) return headers.get(headerName) ?? "";
  if (Array.isArray(headers)) {
    return headers.find(([name]) => name === headerName)?.[1] ?? "";
  }
  return headers[headerName] ?? "";
}

function parseFormBody(body: BodyInit | null | undefined): URLSearchParams {
  assert(body instanceof URLSearchParams, "body should be URLSearchParams");
  return body;
}

function mockGmailMessageResponse(message: unknown) {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(message), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
}

function mockGmailErrorResponse(
  status: number,
  payload: unknown,
  headers: Record<string, string> = {},
) {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    });
}

async function assertGmailApiError(
  expectedCode: string,
  action: () => Promise<unknown>,
) {
  try {
    await action();
  } catch (error) {
    assert(isGmailApiError(error), "error should be a GmailApiError");
    assertEqual(error.code, expectedCode);
    assertEqual(error.message, expectedCode);
    return;
  }

  throw new Error("expected Gmail API call to throw");
}

async function main() {
  console.log("Gmail OAuth State");

  await test("generates a 32-byte hex state", () => {
    const state = generateOAuthState();

    assert(/^[a-f0-9]{64}$/.test(state), "state should be 64 hex characters");
  });

  console.log("\nGmail Authorization URL");

  await test("builds profile-only authorization URL by default", () => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";

    const url = new URL(
      buildAuthorizationUrl("state-123", "http://localhost:3000/callback"),
    );
    const scopes = url.searchParams.get("scope")?.split(" ") ?? [];

    assertEqual(url.origin, "https://accounts.google.com");
    assertEqual(url.pathname, "/o/oauth2/v2/auth");
    assertEqual(url.searchParams.get("client_id"), "test-google-client-id");
    assertEqual(
      url.searchParams.get("redirect_uri"),
      "http://localhost:3000/callback",
    );
    assertEqual(url.searchParams.get("response_type"), "code");
    assertEqual(url.searchParams.get("access_type"), "offline");
    assertEqual(url.searchParams.get("include_granted_scopes"), "true");
    assertEqual(url.searchParams.get("prompt"), "consent");
    assertEqual(url.searchParams.get("state"), "state-123");
    assert(scopes.includes("openid"), "openid scope should be present");
    assert(scopes.includes("email"), "email scope should be present");
    assert(scopes.includes("profile"), "profile scope should be present");
    assert(
      !scopes.includes("https://www.googleapis.com/auth/gmail.readonly"),
      "gmail.readonly scope should not be requested by default",
    );
  });

  await test("adds Gmail readonly scope when requested", () => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";

    const url = new URL(
      buildAuthorizationUrl("state-123", "http://localhost:3000/callback", {
        requestGmailReadonly: true,
      }),
    );
    const scopes = url.searchParams.get("scope")?.split(" ") ?? [];

    assert(
      scopes.includes("https://www.googleapis.com/auth/gmail.readonly"),
      "gmail.readonly scope should be requested",
    );
  });

  await test("requires a Google client id", () => {
    delete process.env.GOOGLE_CLIENT_ID;

    try {
      buildAuthorizationUrl("state-123", "http://localhost:3000/callback");
    } catch (error) {
      assertEqual((error as Error).message, "GOOGLE_CLIENT_ID is not set");
      return;
    }

    throw new Error("expected buildAuthorizationUrl to throw");
  });

  console.log("\nGmail Token Exchange");

  await test("exchanges authorization code with safe form fields", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
    let requestedUrl = "";
    let method = "";
    let contentType = "";
    let body = new URLSearchParams();

    globalThis.fetch = async (input, init) => {
      requestedUrl = String(input);
      method = init?.method ?? "";
      contentType = getHeaderValue(init?.headers, "Content-Type");
      body = parseFormBody(init?.body);

      return new Response(
        JSON.stringify({
          access_token: "redacted-access-token",
          refresh_token: "redacted-refresh-token",
          id_token: "redacted-id-token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "openid email profile",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    };

    const tokens = await exchangeCodeForTokens(
      "redacted-authorization-code",
      "http://localhost:3000/api/auth/gmail/callback",
    );

    assertEqual(requestedUrl, "https://oauth2.googleapis.com/token");
    assertEqual(method, "POST");
    assertEqual(contentType, "application/x-www-form-urlencoded");
    assertEqual(body.get("code"), "redacted-authorization-code");
    assertEqual(body.get("client_id"), "test-google-client-id");
    assertEqual(body.get("client_secret"), "test-google-client-secret");
    assertEqual(
      body.get("redirect_uri"),
      "http://localhost:3000/api/auth/gmail/callback",
    );
    assertEqual(body.get("grant_type"), "authorization_code");
    assertEqual(tokens.access_token, "redacted-access-token");
  });

  await test("requires Google OAuth credentials for token exchange", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    try {
      await exchangeCodeForTokens(
        "redacted-authorization-code",
        "http://localhost:3000/api/auth/gmail/callback",
      );
    } catch (error) {
      assertEqual((error as Error).message, "Google OAuth credentials not configured");
      return;
    }

    throw new Error("expected exchangeCodeForTokens to throw");
  });

  await test("uses a safe token exchange error", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
    globalThis.fetch = async () =>
      new Response("raw google token error body", { status: 400 });

    try {
      await exchangeCodeForTokens(
        "redacted-authorization-code",
        "http://localhost:3000/api/auth/gmail/callback",
      );
    } catch (error) {
      assertEqual((error as Error).message, "Token exchange failed");
      return;
    }

    throw new Error("expected exchangeCodeForTokens to throw");
  });

  console.log("\nGmail Token Refresh");

  await test("refreshes access token with safe form fields", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
    let requestedUrl = "";
    let method = "";
    let contentType = "";
    let body = new URLSearchParams();

    globalThis.fetch = async (input, init) => {
      requestedUrl = String(input);
      method = init?.method ?? "";
      contentType = getHeaderValue(init?.headers, "Content-Type");
      body = parseFormBody(init?.body);

      return new Response(
        JSON.stringify({
          access_token: "redacted-new-access-token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "openid email profile",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    };

    const tokens = await refreshAccessToken("redacted-refresh-token");

    assertEqual(requestedUrl, "https://oauth2.googleapis.com/token");
    assertEqual(method, "POST");
    assertEqual(contentType, "application/x-www-form-urlencoded");
    assertEqual(body.get("client_id"), "test-google-client-id");
    assertEqual(body.get("client_secret"), "test-google-client-secret");
    assertEqual(body.get("refresh_token"), "redacted-refresh-token");
    assertEqual(body.get("grant_type"), "refresh_token");
    assertEqual(tokens.access_token, "redacted-new-access-token");
  });

  await test("requires Google OAuth credentials for token refresh", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    try {
      await refreshAccessToken("redacted-refresh-token");
    } catch (error) {
      assertEqual((error as Error).message, "Google OAuth credentials not configured");
      return;
    }

    throw new Error("expected refreshAccessToken to throw");
  });

  await test("uses a safe token refresh error", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
    globalThis.fetch = async () =>
      new Response("raw google refresh error body", { status: 400 });

    try {
      await refreshAccessToken("redacted-refresh-token");
    } catch (error) {
      assertEqual((error as Error).message, "Token refresh failed");
      return;
    }

    throw new Error("expected refreshAccessToken to throw");
  });

  console.log("\nGmail Scope Detection");

  await test("detects Gmail readonly scope", () => {
    assertEqual(
      hasGmailReadonlyScope(
        "openid email https://www.googleapis.com/auth/gmail.readonly profile",
      ),
      true,
    );
  });

  await test("does not match partial Gmail readonly scope", () => {
    assertEqual(
      hasGmailReadonlyScope(
        "openid email https://www.googleapis.com/auth/gmail.readonly.metadata",
      ),
      false,
    );
  });

  await test("handles missing scope", () => {
    assertEqual(hasGmailReadonlyScope(undefined), false);
  });

  console.log("\nGmail Profile");

  await test("uses id_token email without calling userinfo", async () => {
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      throw new Error("fetch should not be called for id_token profile");
    };

    const profile = await getGmailProfile(
      "redacted-access-token",
      makeIdToken({ email: "USER@Example.COM" }),
    );

    assertEqual(profile.emailAddress, "user@example.com");
    assertEqual(fetchCalls, 0);
  });

  await test("falls back to userinfo when id_token is invalid", async () => {
    let requestedUrl = "";
    let authorizationHeader = "";
    globalThis.fetch = async (input, init) => {
      requestedUrl = String(input);
      authorizationHeader = getAuthorizationHeader(init?.headers);

      return new Response(JSON.stringify({ email: "USERINFO@Example.COM" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const profile = await getGmailProfile(
      "redacted-access-token",
      "malformed-token",
    );

    assertEqual(profile.emailAddress, "userinfo@example.com");
    assertEqual(
      requestedUrl,
      "https://openidconnect.googleapis.com/v1/userinfo",
    );
    assertEqual(authorizationHeader, "Bearer redacted-access-token");
  });

  await test("throws safe error when profile email is missing", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    try {
      await getGmailProfile("redacted-access-token", "malformed-token");
    } catch (error) {
      assertEqual((error as Error).message, "Google profile email missing");
      return;
    }

    throw new Error("expected getGmailProfile to throw");
  });

  await test("throws safe error when userinfo fails", async () => {
    globalThis.fetch = async () =>
      new Response("raw google profile error body", { status: 500 });

    try {
      await getGmailProfile("redacted-access-token", "malformed-token");
    } catch (error) {
      assertEqual((error as Error).message, "Gmail profile fetch failed");
      return;
    }

    throw new Error("expected getGmailProfile to throw");
  });

  console.log("\nGmail Message Parsing");

  await test("parses RFC 2047 headers and prefers text/plain body", async () => {
    mockGmailMessageResponse({
      id: "gmail-msg-1",
      threadId: "thread-1",
      snippet: "Short snippet",
      internalDate: "1767225600000",
      payload: {
        headers: [
          { name: "From", value: "=?UTF-8?B?5rWL6K+V?= <sender@example.com>" },
          { name: "Subject", value: "=?UTF-8?B?6aqM6K+B56CB?=" },
          { name: "Date", value: "Wed, 01 Jan 2025 00:00:00 +0000" },
        ],
        body: { size: 0 },
        parts: [
          {
            mimeType: "text/html",
            body: { size: 12, data: encodeBase64Url("<p>HTML body</p>") },
          },
          {
            mimeType: "text/plain",
            body: { size: 11, data: encodeBase64Url("Plain body") },
          },
        ],
      },
    });

    const message = await getGmailMessage("redacted-access-token", "gmail-msg-1");

    assertEqual(message.messageId, "gmail-msg-1");
    assertEqual(message.threadId, "thread-1");
    assertEqual(message.sender, "测试");
    assertEqual(message.subject, "验证码");
    assertEqual(message.bodyText, "Plain body");
    assertEqual(message.snippet, "Short snippet");
    assertEqual(message.receivedAt.toISOString(), "2025-01-01T00:00:00.000Z");
  });

  await test("strips HTML fallback body and decodes entities", async () => {
    mockGmailMessageResponse({
      id: "gmail-msg-2",
      threadId: "thread-2",
      snippet: "",
      internalDate: "1767225600000",
      payload: {
        headers: [
          { name: "From", value: "<sender@example.com>" },
          { name: "Subject", value: "" },
        ],
        body: { size: 0 },
        parts: [
          {
            mimeType: "text/html",
            body: {
              size: 28,
              data: encodeBase64Url(
                "<html><body><p>A&amp;B</p><script>hide()</script></body></html>",
              ),
            },
          },
        ],
      },
    });

    const message = await getGmailMessage("redacted-access-token", "gmail-msg-2");

    assertEqual(message.sender, "sender@example.com");
    assertEqual(message.subject, "(no subject)");
    assertEqual(message.bodyText, "A&B");
    assertEqual(message.receivedAt.toISOString(), "2026-01-01T00:00:00.000Z");
  });

  await test("strips top-level HTML body", async () => {
    mockGmailMessageResponse({
      id: "gmail-msg-3",
      threadId: "thread-3",
      snippet: "",
      internalDate: "1767225600000",
      payload: {
        headers: [],
        mimeType: "text/html",
        body: {
          size: 23,
          data: encodeBase64Url("<p>Hello <b>World</b></p>"),
        },
      },
    });

    const message = await getGmailMessage("redacted-access-token", "gmail-msg-3");

    assertEqual(message.sender, "unknown");
    assertEqual(message.subject, "(no subject)");
    assertEqual(message.bodyText, "Hello World");
  });

  console.log("\nGmail API Error Mapping");

  await test("maps 401 list failures to token expired", async () => {
    mockGmailErrorResponse(401, {
      error: { message: "Invalid Credentials" },
    });

    await assertGmailApiError("gmail_token_expired", () =>
      listGmailMessages("redacted-access-token"),
    );
  });

  await test("maps insufficient scope failures to a re-authorization error", async () => {
    mockGmailErrorResponse(403, {
      error: {
        message: "Request had insufficient authentication scopes.",
        errors: [{ reason: "insufficientPermissions" }],
      },
    });

    await assertGmailApiError("gmail_insufficient_scope", () =>
      listGmailMessages("redacted-access-token"),
    );
  });

  await test("maps disabled Gmail API failures to setup guidance", async () => {
    mockGmailErrorResponse(403, {
      error: {
        message: "Gmail API has not been used in project before or it is disabled.",
        errors: [{ reason: "accessNotConfigured" }],
      },
    });

    await assertGmailApiError("gmail_api_not_enabled", () =>
      listGmailMessages("redacted-access-token"),
    );
  });

  await test("maps domain policy failures distinctly", async () => {
    mockGmailErrorResponse(403, {
      error: {
        message: "The domain policy has disabled third-party app access.",
        errors: [{ reason: "domainPolicy" }],
      },
    });

    await assertGmailApiError("gmail_domain_policy", () =>
      listGmailMessages("redacted-access-token"),
    );
  });

  await test("maps quota and rate limit failures distinctly", async () => {
    mockGmailErrorResponse(429, {
      error: {
        message: "User rate limit exceeded.",
        errors: [{ reason: "userRateLimitExceeded" }],
      },
    });

    await assertGmailApiError("gmail_rate_limited", () =>
      listGmailMessages("redacted-access-token"),
    );

    assertEqual(
      formatRateLimitMessage("Gmail", null),
      "Gmail sync is temporarily rate limited. Please try again later.",
    );
  });

  await test("keeps Gmail rate limit details safe and uses Retry-After", async () => {
    mockGmailErrorResponse(
      429,
      {
        error: {
          message: "raw upstream rate limit body with token-like details",
          errors: [{ reason: "rateLimitExceeded" }],
        },
      },
      { "Retry-After": "12" },
    );

    try {
      await listGmailMessages("redacted-access-token");
    } catch (error) {
      assert(isGmailApiError(error), "429 should map to GmailApiError");
      assertEqual(error.code, "gmail_rate_limited");
      assertEqual(error.message, "gmail_rate_limited");
      assertEqual(error.retryAfterSeconds, 12);

      const safeMessage = formatRateLimitMessage(
        "Gmail",
        error.retryAfterSeconds,
      );
      assert(
        safeMessage.includes("about 12 seconds"),
        "safe message should include Retry-After seconds",
      );
      assert(
        !safeMessage.includes("raw upstream"),
        "safe message should not include upstream body",
      );
      return;
    }

    throw new Error("expected Gmail API call to throw");
  });

  await test("uses a safe fallback for unmapped Gmail API failures", async () => {
    mockGmailErrorResponse(500, {
      error: {
        message: "raw upstream failure containing sensitive details",
      },
    });

    try {
      await listGmailMessages("redacted-access-token");
    } catch (error) {
      assert(!isGmailApiError(error), "unmapped 500 should use a generic Error");
      assertEqual((error as Error).message, "Gmail list failed");
      return;
    }

    throw new Error("expected Gmail API call to throw");
  });

  if (originalClientId === undefined) {
    delete process.env.GOOGLE_CLIENT_ID;
  } else {
    process.env.GOOGLE_CLIENT_ID = originalClientId;
  }
  if (originalClientSecret === undefined) {
    delete process.env.GOOGLE_CLIENT_SECRET;
  } else {
    process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
  }
  globalThis.fetch = originalFetch;

  console.log(`\n${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error("SOME TESTS FAILED");
    process.exit(1);
  }

  console.log("All tests passed.");
}

main().catch((error) => {
  if (originalClientId === undefined) {
    delete process.env.GOOGLE_CLIENT_ID;
  } else {
    process.env.GOOGLE_CLIENT_ID = originalClientId;
  }
  if (originalClientSecret === undefined) {
    delete process.env.GOOGLE_CLIENT_SECRET;
  } else {
    process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
  }
  globalThis.fetch = originalFetch;
  console.error(error);
  process.exit(1);
});
