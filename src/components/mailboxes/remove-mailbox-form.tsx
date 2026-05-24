"use client";

import { deleteMailboxAction } from "@/app/mailboxes/actions";

export function RemoveMailboxForm({
  mailboxId,
  provider,
  address,
}: {
  mailboxId: string;
  provider: string;
  address: string;
}) {
  return (
    <form
      action={deleteMailboxAction}
      onSubmit={(e) => {
        const confirmed = window.confirm(
          `Remove ${provider} mailbox ${address}?\n\nThis will permanently delete all local messages, credentials, and sync logs for this mailbox. This cannot be undone.`,
        );
        if (!confirmed) e.preventDefault();
      }}
    >
      <input name="mailboxId" type="hidden" value={mailboxId} />
      <button
        className="w-full rounded-full border border-red-400 px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-red-600 hover:bg-red-50"
        type="submit"
      >
        Remove
      </button>
    </form>
  );
}
