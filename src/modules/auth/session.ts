import crypto from "node:crypto";
import { db } from "@/lib/db";
import { SESSION_TTL_SECONDS } from "./constants";

export type AuthUser = {
  id: string;
  email: string;
  role: "owner" | "member";
};

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await db.session.create({
    data: { tokenHash, expiresAt, userId },
  });

  return token;
}

export async function validateSession(token: string): Promise<AuthUser | null> {
  const tokenHash = hashToken(token);

  const session = await db.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date()) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role as "owner" | "member",
  };
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);

  await db.session.deleteMany({ where: { tokenHash } });
}
