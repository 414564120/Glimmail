"use server";

import { redirect } from "next/navigation";
import { setSessionCookie, verifyPasswordCredentials } from "@/modules/auth";

const ALLOWED_NEXT_PATHS = ["/inbox", "/mailboxes", "/settings"];

function getSafeNextPath(value: FormDataEntryValue | null) {
  const nextPath = String(value || "");

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/inbox";
  }

  if (
    !ALLOWED_NEXT_PATHS.some(
      (route) =>
        nextPath === route ||
        nextPath.startsWith(`${route}/`) ||
        nextPath.startsWith(`${route}?`),
    )
  ) {
    return "/inbox";
  }

  return nextPath;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const nextPath = getSafeNextPath(formData.get("next"));

  const user = await verifyPasswordCredentials(email, password);

  if (!user) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(nextPath)}`);
  }

  await setSessionCookie(user);
  redirect(nextPath);
}
