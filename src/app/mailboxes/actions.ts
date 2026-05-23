"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { addMailbox, deleteMailbox } from "@/modules/mailboxes";

export async function addMailboxAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mailboxes");

  const provider = String(formData.get("provider") || "");
  const address = String(formData.get("address") || "");
  const authCode = String(formData.get("authCode") || "");
  const returnTo = String(formData.get("returnTo") || "");
  const failurePath = returnTo.startsWith("/mailboxes/connect")
    ? returnTo
    : "/mailboxes";

  const credential =
    authCode && provider === "mail163"
      ? { kind: "app_password" as const, plaintext: authCode }
      : undefined;
  const result = await addMailbox(user.id, provider, address, credential);
  if ("error" in result) {
    const separator = failurePath.includes("?") ? "&" : "?";
    redirect(
      `${failurePath}${separator}error=${encodeURIComponent(result.error)}`,
    );
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
