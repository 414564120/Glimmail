import { createSyncSummary } from "./sync-summary";

type TestCase = {
  name: string;
  fetchedCount: number;
  createdCount: number;
  expected: ReturnType<typeof createSyncSummary>;
};

const testCases: TestCase[] = [
  {
    name: "no messages",
    fetchedCount: 0,
    createdCount: 0,
    expected: {
      logMessage: "No messages in mailbox.",
      bannerMessage: "No messages found.",
    },
  },
  {
    name: "imports one new message",
    fetchedCount: 1,
    createdCount: 1,
    expected: {
      logMessage: "Fetched 1, imported 1 new message.",
      bannerMessage: "Imported 1 new message.",
    },
  },
  {
    name: "imports multiple new messages",
    fetchedCount: 3,
    createdCount: 3,
    expected: {
      logMessage: "Fetched 3, imported 3 new messages.",
      bannerMessage: "Imported 3 new messages.",
    },
  },
  {
    name: "reports partial duplicates",
    fetchedCount: 10,
    createdCount: 4,
    expected: {
      logMessage: "Fetched 10, imported 4 new messages.",
      bannerMessage: "Imported 4 new messages (6 already synced).",
    },
  },
  {
    name: "reports all duplicates",
    fetchedCount: 10,
    createdCount: 0,
    expected: {
      logMessage: "Fetched 10, imported 0 new messages.",
      bannerMessage: "All 10 messages already synced.",
    },
  },
];

let passed = 0;

for (const testCase of testCases) {
  const actual = createSyncSummary({
    fetchedCount: testCase.fetchedCount,
    createdCount: testCase.createdCount,
  });

  if (
    actual.logMessage !== testCase.expected.logMessage ||
    actual.bannerMessage !== testCase.expected.bannerMessage
  ) {
    throw new Error(
      `${testCase.name}: expected ${JSON.stringify(testCase.expected)}, received ${JSON.stringify(actual)}`,
    );
  }

  passed += 1;
}

console.log(`sync summary: ${passed} passed, 0 failed`);
