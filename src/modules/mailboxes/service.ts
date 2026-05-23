import { db } from "@/lib/db";
import type { Mailbox, MailboxStatus } from "@prisma/client";
import { encrypt } from "@/modules/security/crypto";
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
  credential?: { kind: "app_password" | "oauth_token"; plaintext: string },
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

  const encryptedSecret = credential?.plaintext
    ? encrypt(credential.plaintext)
    : null;

  try {
    const mailbox = await db.$transaction(async (tx) => {
      const createdMailbox = await tx.mailbox.create({
        data: { userId, provider, address: trimmedAddress },
      });

      if (encryptedSecret && credential) {
        await tx.mailboxCredential.create({
          data: {
            encryptedSecret,
            kind: credential.kind,
            mailboxId: createdMailbox.id,
            userId,
          },
        });
      }

      return createdMailbox;
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

export async function updateMailboxStatus(
  userId: string,
  mailboxId: string,
  status: MailboxStatus,
): Promise<ActionResult> {
  const result = await db.mailbox.updateMany({
    where: { id: mailboxId, userId },
    data: { status },
  });

  if (result.count === 0) {
    return { error: "Mailbox not found." };
  }

  return { success: true };
}

export async function deleteMailbox(
  userId: string,
  mailboxId: string,
): Promise<ActionResult> {
  const result = await db.mailbox.deleteMany({
    where: { id: mailboxId, userId },
  });

  if (result.count === 0) {
    return { error: "Mailbox not found." };
  }

  return { success: true };
}
