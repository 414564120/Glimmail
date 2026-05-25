import { getSafeNextPath } from "./next-path";

type TestCase = {
  name: string;
  input: string | null | undefined;
  expected: string;
};

const testCases: TestCase[] = [
  {
    name: "allows protected root route",
    input: "/settings",
    expected: "/settings",
  },
  {
    name: "allows child route",
    input: "/mailboxes/connect",
    expected: "/mailboxes/connect",
  },
  {
    name: "allows query on protected route",
    input: "/inbox?mailbox=abc",
    expected: "/inbox?mailbox=abc",
  },
  {
    name: "rejects external URL",
    input: "https://example.com/inbox",
    expected: "/inbox",
  },
  {
    name: "rejects protocol-relative URL",
    input: "//example.com/inbox",
    expected: "/inbox",
  },
  {
    name: "rejects fake route prefix",
    input: "/inboxevil",
    expected: "/inbox",
  },
  {
    name: "rejects control characters in query",
    input: "/inbox?mailbox=abc\nSet-Cookie: secret",
    expected: "/inbox",
  },
  {
    name: "trims allowed path",
    input: " /settings ",
    expected: "/settings",
  },
  {
    name: "falls back for blank input",
    input: undefined,
    expected: "/inbox",
  },
];

let passed = 0;

for (const testCase of testCases) {
  const actual = getSafeNextPath(testCase.input);

  if (actual !== testCase.expected) {
    throw new Error(
      `${testCase.name}: expected ${testCase.expected}, received ${actual}`,
    );
  }

  passed += 1;
}

console.log(`next path sanitizer: ${passed} passed, 0 failed`);
