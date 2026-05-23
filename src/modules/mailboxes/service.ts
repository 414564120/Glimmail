import { db } from "@/lib/db";
import type { Mailbox } from "@prisma/client";
import {
  isValidEmailForProvider,
  isValidProvider,
  PROVIDER_DOMAIN_LABELS,
} from "./validation";

type ActionResult =
  | { success: true; mailbox: Mailbox }
  | { success: true }
  | { error: string };

export function getUserMailboxes(userId: string) {
  return db.mailbox.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function addMailbox(
  userId: string,
  provider: string,
  address: string,
): Promise<ActionResult> {
  if (!isValidProvider(provider)) {
    return { error: `Unknown provider.` };
  }

  const trimmedAddress = address.trim().toLowerCase();

  if (!trimmedAddress.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  if (!isValidEmailForProvider(trimmedAddress, provider)) {
    const label = PROVIDER_DOMAIN_LABELS[provider];
    return { error: `Email must be a ${label} address.` };
  }

  try {
    const mailbox = await db.mailbox.create({
      data: { userId, provider, address: trimmedAddress },
    });
    return { success: true, mailbox };
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as Record<string, unknown>).code === "P2002"
    ) {
      return { error: "This address is already connected." };
    }
    return { error: "Failed to add mailbox. Please try again." };
  }
}

export async function deleteMailbox(
  userId: string,
  mailboxId: string,
): Promise<ActionResult> {
  const existing = await db.mailbox.findUnique({
    where: { id: mailboxId },
  });

  if (!existing || existing.userId !== userId) {
    return { error: "Mailbox not found." };
  }

  await db.mailbox.delete({ where: { id: mailboxId } });
  return { success: true };
}
