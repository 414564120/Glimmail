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
      className="w-full rounded-full border border-[#142a24]/[.14] px-4 py-2 font-label text-xs font-black text-[#30433d] transition hover:-translate-y-px hover:border-[#0b6b66]/35 hover:text-[#0b5551] disabled:cursor-not-allowed disabled:opacity-50"
      label="测试连接"
      mailboxId={mailboxId}
      submittingLabel="测试中..."
    />
  );
}
