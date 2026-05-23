import crypto from "node:crypto";
import { db } from "./client";

const KEY_LENGTH = 64;
const SALT_LENGTH = 32;

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });

  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  const email = process.env.GLIMMAIL_ADMIN_EMAIL || "owner@aethermail.local";
  const password =
    process.env.GLIMMAIL_ADMIN_PASSWORD || "glimmail-dev-password";

  const passwordHash = await hashPassword(password);

  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, role: "owner" },
    create: { email, passwordHash, role: "owner" },
  });

  console.log(`Seed complete: owner user ${user.email} (id: ${user.id})`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
