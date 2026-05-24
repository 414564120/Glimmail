import {
  buildAuthorizationUrl,
  generateOAuthState,
  getGmailMessage,
  hasGmailReadonlyScope,
} from "./gmail";

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

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const originalClientId = process.env.GOOGLE_CLIENT_ID;
const originalFetch = globalThis.fetch;

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function mockGmailMessageResponse(message: unknown) {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(message), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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

  if (originalClientId === undefined) {
    delete process.env.GOOGLE_CLIENT_ID;
  } else {
    process.env.GOOGLE_CLIENT_ID = originalClientId;
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
  globalThis.fetch = originalFetch;
  console.error(error);
  process.exit(1);
});
