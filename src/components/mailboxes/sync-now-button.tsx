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
      className="w-full rounded-full border border-[#d7ff47] bg-[#d7ff47] px-4 py-2 font-label text-xs font-black text-[#071412] transition hover:-translate-y-px hover:bg-[#ecff8a] disabled:cursor-not-allowed disabled:opacity-60"
      label="立即同步"
      mailboxId={mailboxId}
      submittingLabel="同步中..."
    />
  );
}
