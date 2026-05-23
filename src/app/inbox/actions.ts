"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { toggleMessageRead, toggleMessageStarred } from "@/modules/messages";

export async function toggleReadAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inbox");

  const messageId = String(formData.get("messageId") || "");
  await toggleMessageRead(user.id, messageId);

  revalidatePath("/inbox");
  redirect(`/inbox?message=${encodeURIComponent(messageId)}`);
}

export async function toggleStarredAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inbox");

  const messageId = String(formData.get("messageId") || "");
  await toggleMessageStarred(user.id, messageId);

  revalidatePath("/inbox");
  redirect(`/inbox?message=${encodeURIComponent(messageId)}`);
}
