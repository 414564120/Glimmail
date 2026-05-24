"use client";

import {
  testGmailConnectionAction,
  testMailboxConnectionAction,
  testOutlookConnectionAction,
} from "@/app/mailboxes/actions";
import { SubmitOnceButton } from "./submit-once-button";

export function TestConnectionButton({
  provider,
  mailboxId,
}: {
  provider: string;
  mailboxId: string;
}) {
  const action =
    provider === "gmail" ? testGmailConnectionAction
    : provider === "outlook" ? testOutlookConnectionAction
    : testMailboxConnectionAction;

  return (
    <SubmitOnceButton
      action={action}
      className="w-full rounded-full border border-primary/30 px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
      label="Test Connection"
      mailboxId={mailboxId}
      submittingLabel="Testing..."
    />
  );
}
