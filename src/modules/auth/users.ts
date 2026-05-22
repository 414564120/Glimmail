import type { AuthUser } from "./session";

const defaultDevEmail = "owner@aethermail.local";
const defaultDevPassword = "glimmail-dev-password";

function getAdminEmail() {
  return process.env.GLIMMAIL_ADMIN_EMAIL || defaultDevEmail;
}

function getAdminPassword() {
  const password = process.env.GLIMMAIL_ADMIN_PASSWORD;

  if (password) {
    return password;
  }

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return defaultDevPassword;
}

export function getDefaultAdminUser(): AuthUser {
  return {
    email: getAdminEmail(),
    id: "user_owner",
    name: "Owner",
    role: "owner",
  };
}

export async function verifyPasswordCredentials(email: string, password: string) {
  const adminPassword = getAdminPassword();

  if (!adminPassword) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail !== getAdminEmail().toLowerCase()) {
    return null;
  }

  if (password !== adminPassword) {
    return null;
  }

  return getDefaultAdminUser();
}

export const localDevCredentials = {
  email: defaultDevEmail,
  password: defaultDevPassword,
};
