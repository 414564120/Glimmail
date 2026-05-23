"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import {
  addMailbox,
  deleteMailbox,
  updateMailboxStatus,
} from "@/modules/mailboxes";
import { getMailboxCredential } from "@/modules/mailboxes/credentials";
import { testImapConnection } from "@/modules/providers/mail163";
import { db } from "@/lib/db";

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

export async function testMailboxConnectionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mailboxes");

  const mailboxId = String(formData.get("mailboxId") || "");

  const mailbox = await db.mailbox.findUnique({
    where: { id: mailboxId, userId: user.id },
  });
  if (!mailbox) {
    redirect("/mailboxes?error=" + encodeURIComponent("Mailbox not found."));
  }

  if (mailbox.provider !== "mail163") {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("Connection test is only available for 163 Mail."),
    );
  }

  const password = await getMailboxCredential(
    user.id,
    mailboxId,
    "app_password",
  );
  if (!password) {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("No app password found for this mailbox."),
    );
  }

  const result = await testImapConnection(mailbox.address, password);

  if ("success" in result) {
    await updateMailboxStatus(user.id, mailboxId, "active");
    redirect("/mailboxes?success=" + encodeURIComponent("Connection test passed."));
  }

  await updateMailboxStatus(user.id, mailboxId, "error");
  redirect("/mailboxes?error=" + encodeURIComponent(result.error));
}
