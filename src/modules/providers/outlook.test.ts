/**
 * Lightweight unit tests for Outlook provider parsing functions.
 * Run with: tsx src/modules/providers/outlook.test.ts
 */

import {
  parseOutlookMessage,
  hasMailReadScope,
  type OutlookMessageEntry,
} from "./outlook";

let passed = 0;
let failed = 0;

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

// -- Summary ----------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("SOME TESTS FAILED");
  process.exit(1);
} else {
  console.log("All tests passed.");
}
