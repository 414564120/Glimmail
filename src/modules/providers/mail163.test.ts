/**
 * Lightweight unit tests for mail163 provider parsing functions.
 * Run with: tsx src/modules/providers/mail163.test.ts
 */

import {
  decodeImapUtf8,
  parseHeaderValue,
  extractVerificationCode,
  cleanBodyText,
  createPreview,
} from "./mail163";

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

// -- RFC 2047 Subject Decode ------------------------------------------------

console.log("RFC 2047 Subject Decode");

assertEq(
  decodeImapUtf8("=?UTF-8?B?5rWL6K+V6YKu5Lu2?="),
  "测试邮件",
  "Base64 UTF-8 subject",
);

assertEq(
  decodeImapUtf8("=?UTF-8?Q?=E6=B5=8B=E8=AF=95?="),
  "测试",
  "Q-encoded UTF-8 subject",
);

assertEq(
  decodeImapUtf8("=?ISO-8859-1?Q?Hello_World?="),
  "Hello World",
  "Q-encoded with underscore (space)",
);

assertEq(
  decodeImapUtf8("Plain subject"),
  "Plain subject",
  "Plain text subject (no encoding)",
);

assertEq(
  decodeImapUtf8("=?UTF-8?B?5rWL6K+V?= =?UTF-8?B?6YKu5Lu2?="),
  "测试邮件",
  "Multiple adjacent encoded words",
);

assertEq(
  decodeImapUtf8("Re: =?UTF-8?B?5rWL6K+V?="),
  "Re: 测试",
  "Mixed plain and encoded text",
);

// -- Message-Id Extraction --------------------------------------------------

console.log("\nMessage-Id Extraction");

const headerBlock1 = [
  "From: sender@example.com",
  "Subject: Test Email",
  "Date: Sun, 26 May 2024 10:00:00 +0800",
  "Message-Id: <abc123@mail.example.com>",
  "",
].join("\r\n");

assertEq(
  parseHeaderValue(headerBlock1, "Message-Id"),
  "<abc123@mail.example.com>",
  "Standard Message-Id header",
);

assertEq(
  parseHeaderValue(headerBlock1, "Date"),
  "Sun, 26 May 2024 10:00:00 +0800",
  "Date header extraction",
);

const headerBlock2 = [
  "From: another@test.com",
  "Subject: No ID Here",
  "Date: Mon, 01 Jan 2024 00:00:00 +0000",
  "",
].join("\r\n");

assertEq(
  parseHeaderValue(headerBlock2, "Message-Id"),
  "",
  "Missing Message-Id header returns empty string",
);

// Case-insensitive
const headerBlock3 = [
  "message-id: <lowercase@test.com>",
  "",
].join("\r\n");

assertEq(
  parseHeaderValue(headerBlock3, "Message-Id"),
  "<lowercase@test.com>",
  "Case-insensitive Message-Id match",
);

// -- Verification Code Extraction -------------------------------------------

console.log("\nVerification Code Extraction");

assertEq(
  extractVerificationCode("Your verification code is 482916. Do not share it."),
  "482916",
  "English verification code",
);

assertEq(
  extractVerificationCode("Verification Code: 123456"),
  "123456",
  "Verification Code with colon",
);

assertEq(
  extractVerificationCode("验证码: 789012，请勿泄露"),
  "789012",
  "Chinese verification code",
);

assertEq(
  extractVerificationCode("code: 4567"),
  "4567",
  "Short 'code:' pattern",
);

assertEq(
  extractVerificationCode("Your login code: 12345678"),
  "12345678",
  "8-digit code",
);

assertEq(
  extractVerificationCode("No codes here, just regular text."),
  null,
  "No verification code returns null",
);

assertEq(
  extractVerificationCode(""),
  null,
  "Empty string returns null",
);

// -- Body Cleaning ----------------------------------------------------------

console.log("\nBody Cleaning");

// Plain text body
assert(
  cleanBodyText("Hello, this is a plain text email body.") !== null,
  "Plain text body passes through",
);

// MIME boundary cleanup
const mimeBody = [
  "--=_boundary_abc123def456",
  "Content-Type: text/plain; charset=UTF-8",
  "Content-Transfer-Encoding: 7bit",
  "",
  "Actual email content here.",
  "--=_boundary_abc123def456",
  "Content-Type: text/html; charset=UTF-8",
  "",
  "<html><body>HTML version</body></html>",
  "--=_boundary_abc123def456--",
].join("\r\n");

const cleanedMime = cleanBodyText(mimeBody);
assert(cleanedMime !== null, "MIME body is cleaned");
assert(
  cleanedMime!.includes("Actual email content here."),
  "Plain text part preserved in MIME body",
);
assert(
  !cleanedMime!.includes("Content-Type:"),
  "Content-Type header stripped",
);
assert(
  !cleanedMime!.includes("--=_boundary"),
  "MIME boundary stripped",
);

// Empty body
assertEq(cleanBodyText(""), null, "Empty body returns null");
assertEq(cleanBodyText("   \n  "), null, "Whitespace-only body returns null");

// Base64 body
const base64Text = Buffer.from("Decoded verification code: 998877").toString("base64");
const cleanedB64 = cleanBodyText(base64Text);
assert(
  cleanedB64 !== null && cleanedB64.includes("998877"),
  "Base64 encoded body is decoded",
);

// Gibberish fallback (no vowels, high special-char ratio)
assertEq(
  cleanBodyText("x9K#m!2@QzLp*5^&%"),
  null,
  "Gibberish body returns null",
);

// -- Preview Generation -----------------------------------------------------

console.log("\nPreview Generation");

assert(
  createPreview("Short body text.", "Subject").length > 0,
  "Preview from clean body",
);

// Preview from MIME body uses cleaned text
const previewFromMime = createPreview(mimeBody, "Actual Subject");
assert(
  previewFromMime.startsWith("Actual email content here"),
  "Preview from MIME body uses cleaned text",
);

// Preview falls back to subject when body is garbage
const fallbackPreview = createPreview("x9K#m!2@QzLp", "Fallback Subject");
assertEq(fallbackPreview, "Fallback Subject", "Preview falls back to subject");

// Preview from empty body
assertEq(createPreview("", "My Subject"), "My Subject", "Empty body fallback to subject");

// Preview from very short body
assertEq(
  createPreview("Hi", "Welcome Email"),
  "Welcome Email",
  "Very short body falls back to subject",
);

// -- Summary ----------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("SOME TESTS FAILED");
  process.exit(1);
} else {
  console.log("All tests passed.");
}
