import { cookies } from "next/headers";
import {
  createSession,
  deleteSession,
  validateSession,
  type AuthUser,
} from "./session";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "./constants";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  return validateSession(token);
}

export async function setSessionCookie(user: AuthUser) {
  const cookieStore = await cookies();
  const token = await createSession(user.id);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await deleteSession(token);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
