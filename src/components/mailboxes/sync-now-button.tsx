"use client";

import {
  syncGmailAction,
  syncMailboxAction,
  syncOutlookAction,
} from "@/app/mailboxes/actions";
import { SubmitOnceButton } from "./submit-once-button";

export function SyncNowButton({
  provider,
  mailboxId,
}: {
  provider: string;
  mailboxId: string;
}) {
  const action =
    provider === "gmail" ? syncGmailAction
    : provider === "outlook" ? syncOutlookAction
    : syncMailboxAction;

  return (
    <SubmitOnceButton
      action={action}
      className="vibrant-flux w-full rounded-full px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:cursor-not-allowed disabled:opacity-60"
      label="Sync Now"
      mailboxId={mailboxId}
      submittingLabel="Syncing..."
    />
  );
}
