import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/modules/security/crypto";

type CredentialKind = "app_password" | "oauth_token" | "oauth_access_token" | "oauth_refresh_token";

export async function saveMailboxCredential(
  userId: string,
  mailboxId: string,
  kind: CredentialKind,
  plaintext: string,
) {
  const encryptedSecret = encrypt(plaintext);

  return db.mailboxCredential.upsert({
    where: { mailboxId_kind: { mailboxId, kind } },
    create: { mailboxId, userId, kind, encryptedSecret },
    update: { encryptedSecret },
  });
}

export async function getMailboxCredential(
  userId: string,
  mailboxId: string,
  kind: CredentialKind,
): Promise<string | null> {
  const credential = await db.mailboxCredential.findUnique({
    where: { mailboxId_kind: { mailboxId, kind } },
  });

  if (!credential || credential.userId !== userId) return null;

  return decrypt(credential.encryptedSecret);
}

export async function deleteMailboxCredential(
  userId: string,
  mailboxId: string,
  kind: CredentialKind,
) {
  const credential = await db.mailboxCredential.findUnique({
    where: { mailboxId_kind: { mailboxId, kind } },
  });

  if (!credential || credential.userId !== userId) return null;

  await db.mailboxCredential.delete({ where: { id: credential.id } });
  return { success: true };
}
