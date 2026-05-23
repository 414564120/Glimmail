"use server";

import { redirect } from "next/navigation";
import { createPasswordUser, setSessionCookie } from "@/modules/auth";

export async function register(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (password !== confirmPassword) {
    redirect("/register?error=password_mismatch");
  }

  const result = await createPasswordUser(email, password);

  if ("error" in result) {
    redirect(`/register?error=${encodeURIComponent(result.error)}`);
  }

  await setSessionCookie(result.user);
  redirect("/mailboxes");
}
