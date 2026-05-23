import { db } from "@/lib/db";
import { verifyPassword } from "./password";
import type { AuthUser } from "./session";

export async function verifyPasswordCredentials(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role as "owner" | "member",
  };
}
