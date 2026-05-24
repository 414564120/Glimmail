"use server";

import { redirect } from "next/navigation";
import {
  getSafeNextPath,
  setSessionCookie,
  verifyPasswordCredentials,
} from "@/modules/auth";

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
