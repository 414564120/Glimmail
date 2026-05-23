"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { addMailbox, deleteMailbox } from "@/modules/mailboxes";

export async function addMailboxAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mailboxes");

  const provider = String(formData.get("provider") || "");
  const address = String(formData.get("address") || "");

  const result = await addMailbox(user.id, provider, address);
  if ("error" in result) {
    redirect(`/mailboxes?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/mailboxes");
}

export async function deleteMailboxAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mailboxes");

  const mailboxId = String(formData.get("mailboxId") || "");

  const result = await deleteMailbox(user.id, mailboxId);
  if ("error" in result) {
    redirect(`/mailboxes?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/mailboxes");
}
