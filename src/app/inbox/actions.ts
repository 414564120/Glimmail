"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import {
  deleteMessage,
  markMessageRead,
  toggleMessageArchived,
  toggleMessageRead,
  toggleMessageStarred,
  toggleMessageTrashed,
} from "@/modules/messages";

const allowedViews = new Set([
  "archive",
  "drafts",
  "inbox",
  "search",
  "sent",
  "starred",
  "trash",
]);

const allowedPartitions = new Set([
  "all",
  "important",
  "code",
  "notification",
  "subscription",
  "unread",
  "starred",
  "junk",
]);

function getRedirectPath(
  messageId: string,
  view: string,
  partition = "all",
  account = "all",
) {
  const params = new URLSearchParams();

  if (allowedViews.has(view) && view !== "inbox") {
    params.set("view", view);
  }
  if (allowedPartitions.has(partition) && partition !== "all") {
    params.set("partition", partition);
  }
  if (account && account !== "all") {
    params.set("account", account);
  }

  if (messageId) {
    params.set("message", messageId);
  }

  const query = params.toString();
  return query ? `/inbox?${query}` : "/inbox";
}

export async function toggleReadAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inbox");

  const messageId = String(formData.get("messageId") || "");
  const view = String(formData.get("view") || "inbox");
  const partition = String(formData.get("partition") || "all");
  const account = String(formData.get("account") || "all");
  await toggleMessageRead(user.id, messageId);

  revalidatePath("/inbox");
  redirect(getRedirectPath(messageId, view, partition, account));
}

export async function markReadAndOpenAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inbox");

  const messageId = String(formData.get("messageId") || "");
  const view = String(formData.get("view") || "inbox");
  const partition = String(formData.get("partition") || "all");
  const account = String(formData.get("account") || "all");
  await markMessageRead(user.id, messageId);

  revalidatePath("/inbox");
  redirect(getRedirectPath(messageId, view, partition, account));
}

export async function toggleStarredAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inbox");

  const messageId = String(formData.get("messageId") || "");
  const view = String(formData.get("view") || "inbox");
  const partition = String(formData.get("partition") || "all");
  const account = String(formData.get("account") || "all");
  await toggleMessageStarred(user.id, messageId);

  revalidatePath("/inbox");
  redirect(getRedirectPath(messageId, view, partition, account));
}

export async function toggleArchiveAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inbox");

  const messageId = String(formData.get("messageId") || "");
  const view = String(formData.get("view") || "inbox");
  const partition = String(formData.get("partition") || "all");
  const account = String(formData.get("account") || "all");
  await toggleMessageArchived(user.id, messageId);

  revalidatePath("/inbox");
  redirect(getRedirectPath("", view, partition, account));
}

export async function toggleTrashAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inbox");

  const messageId = String(formData.get("messageId") || "");
  const view = String(formData.get("view") || "inbox");
  const partition = String(formData.get("partition") || "all");
  const account = String(formData.get("account") || "all");
  await toggleMessageTrashed(user.id, messageId);

  revalidatePath("/inbox");
  redirect(getRedirectPath("", view, partition, account));
}

export async function deleteMessageAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inbox");

  const messageId = String(formData.get("messageId") || "");
  const view = String(formData.get("view") || "inbox");
  const partition = String(formData.get("partition") || "all");
  const account = String(formData.get("account") || "all");
  await deleteMessage(user.id, messageId);

  revalidatePath("/inbox");
  redirect(getRedirectPath("", view, partition, account));
}
