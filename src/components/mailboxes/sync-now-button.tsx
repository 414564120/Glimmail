"use client";

import { useState } from "react";
import {
  syncGmailAction,
  syncMailboxAction,
  syncOutlookAction,
} from "@/app/mailboxes/actions";

export function SyncNowButton({
  provider,
  mailboxId,
}: {
  provider: string;
  mailboxId: string;
}) {
  const [submitting, setSubmitting] = useState(false);

  const action =
    provider === "gmail" ? syncGmailAction
    : provider === "outlook" ? syncOutlookAction
    : syncMailboxAction;

  return (
    <form
      action={action}
      onSubmit={() => setSubmitting(true)}
    >
      <input name="mailboxId" type="hidden" value={mailboxId} />
      <button
        className="vibrant-flux w-full rounded-full px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Syncing..." : "Sync Now"}
      </button>
    </form>
  );
}
