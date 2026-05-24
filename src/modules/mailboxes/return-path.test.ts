import {
  getSafeMailboxConnectReturnPath,
  MAILBOX_CONNECT_FALLBACK_PATH,
} from "./return-path";

type TestCase = {
  name: string;
  input: string | null | undefined;
  expected: string;
};

const testCases: TestCase[] = [
  {
    name: "allows connect route",
    input: "/mailboxes/connect",
    expected: "/mailboxes/connect",
  },
  {
    name: "allows connect route with query",
    input: "/mailboxes/connect?provider=mail163",
    expected: "/mailboxes/connect?provider=mail163",
  },
  {
    name: "trims allowed path",
    input: " /mailboxes/connect?provider=gmail ",
    expected: "/mailboxes/connect?provider=gmail",
  },
  {
    name: "rejects unknown provider query",
    input: "/mailboxes/connect?provider=evil",
    expected: MAILBOX_CONNECT_FALLBACK_PATH,
  },
  {
    name: "rejects fake route prefix",
    input: "/mailboxes/connectevil",
    expected: MAILBOX_CONNECT_FALLBACK_PATH,
  },
  {
    name: "rejects connect child route",
    input: "/mailboxes/connect/extra",
    expected: MAILBOX_CONNECT_FALLBACK_PATH,
  },
  {
    name: "rejects external URL",
    input: "https://evil.com/mailboxes/connect",
    expected: MAILBOX_CONNECT_FALLBACK_PATH,
  },
  {
    name: "rejects protocol-relative URL",
    input: "//evil.com",
    expected: MAILBOX_CONNECT_FALLBACK_PATH,
  },
  {
    name: "rejects control characters",
    input: "/mailboxes/connect?provider=mail163\nSet-Cookie: secret",
    expected: MAILBOX_CONNECT_FALLBACK_PATH,
  },
  {
    name: "falls back for blank input",
    input: "",
    expected: MAILBOX_CONNECT_FALLBACK_PATH,
  },
  {
    name: "falls back for missing input",
    input: undefined,
    expected: MAILBOX_CONNECT_FALLBACK_PATH,
  },
];

let passed = 0;

for (const testCase of testCases) {
  const actual = getSafeMailboxConnectReturnPath(testCase.input);

  if (actual !== testCase.expected) {
    throw new Error(
      `${testCase.name}: expected ${testCase.expected}, received ${actual}`,
    );
  }

  passed += 1;
}

console.log(`mailbox connect return path sanitizer: ${passed} passed, 0 failed`);
