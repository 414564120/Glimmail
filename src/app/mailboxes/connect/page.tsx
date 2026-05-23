import Link from "next/link";
import { redirect } from "next/navigation";
import type { MailboxProvider } from "@prisma/client";
import {
  AetherSidebar,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/shell/aether-sidebar";
import { SymbolIcon } from "@/components/shell/aether-icons";
import { getCurrentUser } from "@/modules/auth";
import {
  isValidProvider,
  PROVIDER_DOMAIN_LABELS,
} from "@/modules/mailboxes/validation";
import { addMailboxAction } from "../actions";

const PROVIDER_CONFIG: Record<
  MailboxProvider,
  { name: string; iconClass: string; description: string }
> = {
  gmail: {
    name: "Gmail",
    iconClass: "gmail-mark",
    description:
      "Connect a Google account to sync your Gmail inbox. OAuth will be connected in a later step.",
  },
  outlook: {
    name: "Outlook",
    iconClass: "outlook-mark",
    description:
      "Connect a Microsoft account for Exchange and Office 365 access. OAuth will be connected in a later step.",
  },
  mail163: {
    name: "163 Mail",
    iconClass: "netease-mark",
    description:
      "Connect a NetEase 163 account using an app authorization code.",
  },
};

interface PageProps {
  searchParams: Promise<{ provider?: string; error?: string }>;
}

export default async function ConnectPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/mailboxes");
  }

  const { provider: providerParam, error } = await searchParams;

  if (!isValidProvider(String(providerParam ?? ""))) {
    redirect("/mailboxes");
  }

  const provider = providerParam as MailboxProvider;
  const config = PROVIDER_CONFIG[provider];
  const domainHint = PROVIDER_DOMAIN_LABELS[provider];
  const is163 = provider === "mail163";
  const isOAuth = provider === "gmail" || provider === "outlook";

  return (
    <main className="surface-grid min-h-screen bg-background text-slate-950">
      <MobileTopBar />
      <AetherSidebar active="Accounts" />

      <section className="flex min-h-screen items-start justify-center px-4 pb-28 pt-24 md:ml-64 md:px-12 md:pt-24">
        <div className="w-full max-w-lg">
          <Link
            className="mb-8 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-primary"
            href="/mailboxes"
          >
            <SymbolIcon className="text-[18px]">arrow_forward</SymbolIcon>
            Back to Accounts
          </Link>

          {error ? (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <article className="glass-card relative overflow-hidden rounded-xl p-8 text-center">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

            <div className="relative z-10 mb-6 flex size-20 items-center justify-center rounded-full bg-white shadow-sm mx-auto">
              <span className={`provider-logo ${config.iconClass}`} />
            </div>

            <h2 className="mb-2 font-display text-2xl font-bold text-slate-950">
              Connect {config.name}
            </h2>
            <p className="mb-4 text-base leading-relaxed text-slate-600">
              {config.description}
            </p>
            <p className="mb-8 text-sm text-slate-500">
              Accepted domains: {domainHint}
            </p>

            {isOAuth ? (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                OAuth will be connected in a later step. For now, only the email
                address is saved.
              </div>
            ) : null}

            <form action={addMailboxAction}>
              <input name="provider" type="hidden" value={provider} />
              <input
                name="returnTo"
                type="hidden"
                value={`/mailboxes/connect?provider=${provider}`}
              />
              <input
                className="mb-4 w-full rounded-full border border-border-glass bg-white/70 px-4 py-3 text-center text-base text-slate-800 placeholder-slate-400 backdrop-blur-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                name="address"
                placeholder="you@provider.com"
                required
                type="email"
              />

              {is163 ? (
                <>
                  <input
                    className="mb-3 w-full rounded-full border border-border-glass bg-white/70 px-4 py-3 text-center text-base text-slate-800 placeholder-slate-400 backdrop-blur-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    name="authCode"
                    placeholder="Authorization code / App password"
                    type="password"
                  />
                  <p className="mb-4 text-xs leading-relaxed text-slate-500">
                    Authorization codes are not stored yet. This field is a
                    placeholder for the later encrypted credential step.
                  </p>
                </>
              ) : null}

              <button
                className="vibrant-flux hover-lift w-full rounded-full px-6 py-3 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white"
                type="submit"
              >
                Connect Account
              </button>
            </form>
          </article>
        </div>
      </section>

      <MobileBottomNav
        active="Accounts"
        items={[
          ["mail", "Mail"],
          ["hub", "Accounts"],
          ["search", "Search"],
          ["settings", "Settings"],
        ]}
      />
    </main>
  );
}
