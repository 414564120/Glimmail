"use server";

import { redirect } from "next/navigation";
import { setSessionCookie, verifyPasswordCredentials } from "@/modules/auth";

function getSafeNextPath(value: FormDataEntryValue | null) {
  const nextPath = String(value || "");

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/inbox";
  }

  if (!["/inbox", "/mailboxes"].some((route) => nextPath.startsWith(route))) {
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
