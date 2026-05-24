import {
  buildAuthorizationUrl,
  generateOAuthState,
  hasGmailReadonlyScope,
} from "./gmail";

type TestFn = () => void;

let passed = 0;
let failed = 0;

function test(name: string, fn: TestFn) {
  try {
    fn();
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

console.log("Gmail OAuth State");

test("generates a 32-byte hex state", () => {
  const state = generateOAuthState();

  assert(/^[a-f0-9]{64}$/.test(state), "state should be 64 hex characters");
});

console.log("\nGmail Authorization URL");

test("builds profile-only authorization URL by default", () => {
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";

  const url = new URL(
    buildAuthorizationUrl("state-123", "http://localhost:3000/callback"),
  );
  const scopes = url.searchParams.get("scope")?.split(" ") ?? [];

  assertEqual(url.origin, "https://accounts.google.com");
  assertEqual(url.pathname, "/o/oauth2/v2/auth");
  assertEqual(url.searchParams.get("client_id"), "test-google-client-id");
  assertEqual(url.searchParams.get("redirect_uri"), "http://localhost:3000/callback");
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

test("adds Gmail readonly scope when requested", () => {
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

test("requires a Google client id", () => {
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

test("detects Gmail readonly scope", () => {
  assertEqual(
    hasGmailReadonlyScope(
      "openid email https://www.googleapis.com/auth/gmail.readonly profile",
    ),
    true,
  );
});

test("does not match partial Gmail readonly scope", () => {
  assertEqual(
    hasGmailReadonlyScope(
      "openid email https://www.googleapis.com/auth/gmail.readonly.metadata",
    ),
    false,
  );
});

test("handles missing scope", () => {
  assertEqual(hasGmailReadonlyScope(undefined), false);
});

if (originalClientId === undefined) {
  delete process.env.GOOGLE_CLIENT_ID;
} else {
  process.env.GOOGLE_CLIENT_ID = originalClientId;
}

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("SOME TESTS FAILED");
  process.exit(1);
}

console.log("All tests passed.");
