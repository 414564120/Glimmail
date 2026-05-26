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
          `移除 ${provider} 邮箱 ${address}？\n\n这会永久删除本地邮件、凭据和同步记录，无法撤销。`,
        );
        if (!confirmed) e.preventDefault();
      }}
    >
      <input name="mailboxId" type="hidden" value={mailboxId} />
      <button
        className="w-full rounded-full border border-[#ff6b57]/35 px-4 py-2 font-label text-xs font-black text-[#a83a2c] transition hover:-translate-y-px hover:bg-[#ff6b57]/10"
        type="submit"
      >
        移除
      </button>
    </form>
  );
}
