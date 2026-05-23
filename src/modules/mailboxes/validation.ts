import type { MailboxProvider } from "@prisma/client";

const PROVIDER_DOMAINS: Record<MailboxProvider, readonly string[]> = {
  gmail: ["@gmail.com", "@googlemail.com"],
  outlook: ["@outlook.com", "@hotmail.com", "@live.com"],
  mail163: ["@163.com"],
};

const VALID_PROVIDERS = new Set<string>(Object.keys(PROVIDER_DOMAINS));

export function isValidProvider(
  provider: string,
): provider is MailboxProvider {
  return VALID_PROVIDERS.has(provider);
}

export function isValidEmailForProvider(
  email: string,
  provider: MailboxProvider,
): boolean {
  const domains = PROVIDER_DOMAINS[provider];
  if (!domains) return false;

  const normalized = email.toLowerCase().trim();
  return domains.some((domain) => normalized.endsWith(domain));
}

export const PROVIDER_DOMAIN_LABELS: Record<MailboxProvider, string> = {
  gmail: "@gmail.com / @googlemail.com",
  outlook: "@outlook.com / @hotmail.com / @live.com",
  mail163: "@163.com",
};
