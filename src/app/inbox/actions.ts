"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { toggleMessageRead, toggleMessageStarred } from "@/modules/messages";

const allowedViews = new Set([
  "archive",
  "drafts",
  "inbox",
  "search",
  "sent",
  "starred",
  "trash",
]);

function getRedirectPath(messageId: string, view: string) {
  const params = new URLSearchParams();

  if (allowedViews.has(view) && view !== "inbox") {
    params.set("view", view);
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
  await toggleMessageRead(user.id, messageId);

  revalidatePath("/inbox");
  redirect(getRedirectPath(messageId, view));
}

export async function toggleStarredAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inbox");

  const messageId = String(formData.get("messageId") || "");
  const view = String(formData.get("view") || "inbox");
  await toggleMessageStarred(user.id, messageId);

  revalidatePath("/inbox");
  redirect(getRedirectPath(messageId, view));
}
