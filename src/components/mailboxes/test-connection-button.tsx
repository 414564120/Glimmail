"use client";

import { useState } from "react";
import {
  testGmailConnectionAction,
  testMailboxConnectionAction,
  testOutlookConnectionAction,
} from "@/app/mailboxes/actions";

export function TestConnectionButton({
  provider,
  mailboxId,
}: {
  provider: string;
  mailboxId: string;
}) {
  const [submitting, setSubmitting] = useState(false);

  const action =
    provider === "gmail" ? testGmailConnectionAction
    : provider === "outlook" ? testOutlookConnectionAction
    : testMailboxConnectionAction;

  return (
    <form
      action={action}
      onSubmit={() => setSubmitting(true)}
    >
      <input name="mailboxId" type="hidden" value={mailboxId} />
      <button
        className="w-full rounded-full border border-primary/30 px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Testing..." : "Test Connection"}
      </button>
    </form>
  );
}
