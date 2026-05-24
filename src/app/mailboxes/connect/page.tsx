import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { MailboxProvider } from "@prisma/client";
import {
  AetherSidebar,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/shell/aether-sidebar";
import { SymbolIcon } from "@/components/shell/aether-icons";
import { getCurrentUser } from "@/modules/auth";
import { getUserMailboxes } from "@/modules/mailboxes";
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
      "Connect a Google account via OAuth. Gmail inbox sync authorization is added after connection.",
  },
  outlook: {
    name: "Outlook",
    iconClass: "outlook-mark",
    description:
      "Connect a Microsoft account via OAuth. Mail sync will be added in a later step.",
  },
  mail163: {
    name: "163 Mail",
    iconClass: "netease-mark",
    description:
      "Connect a NetEase 163 account using a client authorization code.",
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
  const isGmail = provider === "gmail";
  const isOutlook = provider === "outlook";
  const mailboxes = await getUserMailboxes(user.id);

  let gmailRedirectUri: string | null = null;
  const gmailOAuthConfigured =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

  let outlookRedirectUri: string | null = null;
  const outlookOAuthConfigured =
    !!process.env.MICROSOFT_CLIENT_ID && !!process.env.MICROSOFT_CLIENT_SECRET;

  if (isGmail || isOutlook) {
    const headerStore = await headers();
    const host =
      headerStore.get("x-forwarded-host") ??
      headerStore.get("host") ??
      "localhost:3000";
    const proto =
      headerStore.get("x-forwarded-proto") ??
      (host.startsWith("localhost") ? "http" : "https");
    if (isGmail) {
      gmailRedirectUri =
        process.env.GOOGLE_REDIRECT_URI ??
        `${proto}://${host}/api/auth/gmail/callback`;
    }
    if (isOutlook) {
      outlookRedirectUri =
        process.env.MICROSOFT_REDIRECT_URI ??
        `${proto}://${host}/api/auth/outlook/callback`;
    }
  }

  return (
    <main className="surface-grid min-h-screen bg-background text-slate-950">
      <MobileTopBar />
      <AetherSidebar
        active="Accounts"
        connectedAccountCount={mailboxes.length}
      />

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

            {isGmail ? (
              <>
                {gmailOAuthConfigured ? (
                  <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    You will be redirected to Google to authorize access to your
                    Google account profile. Gmail inbox sync requires a separate
                    read-only authorization after connection.
                  </div>
                ) : (
                  <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
                    <p className="font-label text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                      Google setup required
                    </p>
                    <p className="mt-2 leading-relaxed">
                      Create a Google OAuth Web application, then add these
                      values to <span className="font-mono">.env.local</span>{" "}
                      and restart <span className="font-mono">pnpm dev</span>.
                    </p>
                    <div className="mt-3 space-y-2 rounded-md bg-white/60 p-3 text-xs text-amber-950">
                      <p>
                        <span className="font-semibold">Required env:</span>{" "}
                        <span className="font-mono">GOOGLE_CLIENT_ID</span>,{" "}
                        <span className="font-mono">GOOGLE_CLIENT_SECRET</span>
                      </p>
                      <p>
                        <span className="font-semibold">Redirect URI:</span>{" "}
                        <span className="break-all font-mono">
                          {gmailRedirectUri}
                        </span>
                      </p>
                      <p>
                        Add the redirect URI above to Google Cloud Console under
                        Authorized redirect URIs.
                      </p>
                    </div>
                  </div>
                )}
                {gmailOAuthConfigured ? (
                  <a
                    className="vibrant-flux hover-lift inline-block w-full rounded-full px-6 py-3 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white"
                    href="/api/auth/gmail/start"
                  >
                    Connect with Google
                  </a>
                ) : (
                  <button
                    className="w-full cursor-not-allowed rounded-full border border-slate-300 px-6 py-3 font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-400"
                    disabled
                    type="button"
                  >
                    Connect with Google
                  </button>
                )}
              </>
            ) : isOutlook ? (
              <>
                {outlookOAuthConfigured ? (
                  <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    You will be redirected to Microsoft to authorize access to
                    your Microsoft account. Mail sync requires a separate
                    permission step after connection.
                  </div>
                ) : (
                  <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
                    <p className="font-label text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                      Microsoft setup required
                    </p>
                    <p className="mt-2 leading-relaxed">
                      Register an app in the Azure portal, then add these
                      values to <span className="font-mono">.env.local</span>{" "}
                      and restart <span className="font-mono">pnpm dev</span>.
                    </p>
                    <div className="mt-3 space-y-2 rounded-md bg-white/60 p-3 text-xs text-amber-950">
                      <p>
                        <span className="font-semibold">Required env:</span>{" "}
                        <span className="font-mono">MICROSOFT_CLIENT_ID</span>,{" "}
                        <span className="font-mono">MICROSOFT_CLIENT_SECRET</span>
                      </p>
                      <p>
                        <span className="font-semibold">Redirect URI:</span>{" "}
                        <span className="break-all font-mono">
                          {outlookRedirectUri}
                        </span>
                      </p>
                      <p>
                        Add the redirect URI above to Azure portal under
                        Authentication &rarr; Redirect URIs.
                      </p>
                    </div>
                  </div>
                )}
                {outlookOAuthConfigured ? (
                  <a
                    className="vibrant-flux hover-lift inline-block w-full rounded-full px-6 py-3 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white"
                    href="/api/auth/outlook/start"
                  >
                    Connect with Microsoft
                  </a>
                ) : (
                  <button
                    className="w-full cursor-not-allowed rounded-full border border-slate-300 px-6 py-3 font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-400"
                    disabled
                    type="button"
                  >
                    Connect with Microsoft
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="mb-8 text-sm text-slate-500">
                  Accepted domains: {domainHint}
                </p>

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
                        placeholder="163 client authorization code"
                        type="password"
                      />
                      <p className="mb-4 text-xs leading-relaxed text-slate-500">
                        Use the client authorization code from 163 Mail
                        settings, not your mailbox login password. The code is
                        encrypted with AES-256-GCM before being stored.
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
              </>
            )}
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
