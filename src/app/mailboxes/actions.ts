"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import {
  addMailbox,
  deleteMailbox,
  getUserMailbox,
  updateMailboxStatus,
} from "@/modules/mailboxes";
import { getMailboxCredential } from "@/modules/mailboxes/credentials";
import { createSyncLog } from "@/modules/synclogs/service";
import type { Mail163ConnectionErrorCode } from "@/modules/providers/mail163";
import { testImapConnection } from "@/modules/providers/mail163";

const MAIL163_CONNECTION_ERROR_MESSAGES: Record<
  Mail163ConnectionErrorCode,
  string
> = {
  authentication_failed:
    "Authentication failed. Use your 163 client authorization code, not your mailbox login password.",
  timeout: "Connection timed out. Please check your network and try again.",
  network_unreachable:
    "Could not reach the 163 IMAP server. Please check your network.",
  tls_failed:
    "The secure connection to the 163 IMAP server failed. Please try again later.",
  unknown: "Connection test failed. Please try again later.",
};

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

  const mailbox = await getUserMailbox(user.id, mailboxId);
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

  const startedAt = new Date();
  const result = await testImapConnection(mailbox.address, password);
  const finishedAt = new Date();

  if ("success" in result) {
    await Promise.all([
      updateMailboxStatus(user.id, mailboxId, "active"),
      createSyncLog({
        userId: user.id,
        mailboxId,
        status: "success",
        startedAt,
        finishedAt,
        message: "IMAP login succeeded.",
      }),
    ]);
    redirect(
      "/mailboxes?success=" +
        encodeURIComponent("Connection test passed."),
    );
  }

  const errorMessage = MAIL163_CONNECTION_ERROR_MESSAGES[result.error];
  await Promise.all([
    updateMailboxStatus(user.id, mailboxId, "error"),
    createSyncLog({
      userId: user.id,
      mailboxId,
      status: "error",
      startedAt,
      finishedAt,
      message: errorMessage,
    }),
  ]);
  redirect(
    "/mailboxes?error=" + encodeURIComponent(errorMessage),
  );
}
