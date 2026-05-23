import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import type { AuthUser } from "./session";

type CreateUserResult = { user: AuthUser } | { error: string };

export async function verifyPasswordCredentials(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.user
    .findUnique({
      where: { email: normalizedEmail },
    })
    .catch(() => null);

  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role as "owner" | "member",
  };
}

export async function createPasswordUser(
  email: string,
  password: string,
): Promise<CreateUserResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existingUsers = await db.user.count().catch(() => null);

  if (existingUsers === null) {
    return { error: "Database is not ready. Please run setup first." };
  }

  const registrationOpen =
    existingUsers === 0 || process.env.GLIMMAIL_ALLOW_REGISTRATION === "true";

  if (!registrationOpen) {
    return { error: "Registration is closed." };
  }

  const passwordHash = await hashPassword(password);
  const role = existingUsers === 0 ? "owner" : "member";

  try {
    const user = await db.user.create({
      data: { email: normalizedEmail, passwordHash, role },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as "owner" | "member",
      },
    };
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as Record<string, unknown>).code === "P2002"
    ) {
      return { error: "This email is already registered." };
    }

    return { error: "Failed to create account. Please try again." };
  }
}
