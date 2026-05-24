import Link from "next/link";
import { redirect } from "next/navigation";
import type { MailboxProvider } from "@prisma/client";
import {
  AetherSidebar,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/shell/aether-sidebar";
import { getCurrentUser } from "@/modules/auth";
import { getRecentSyncLogs, getUserMailboxes } from "@/modules/mailboxes";
import { getMailboxCredential } from "@/modules/mailboxes/credentials";
import { hasGmailReadonlyScope } from "@/modules/providers/gmail";
import { hasMailReadScope } from "@/modules/providers/outlook";
import {
  deleteMailboxAction,
  syncGmailAction,
  syncMailboxAction,
  syncOutlookAction,
  testGmailConnectionAction,
  testMailboxConnectionAction,
  testOutlookConnectionAction,
} from "./actions";

const PROVIDER_CARDS: Array<{
  provider: MailboxProvider;
  name: string;
  iconClass: string;
  description: string;
}> = [
  {
    provider: "gmail",
    name: "Gmail",
    iconClass: "gmail-mark",
    description:
      "Sync your primary Google workspace and personal accounts seamlessly.",
  },
  {
    provider: "outlook",
    name: "Outlook",
    iconClass: "outlook-mark",
    description:
      "Integrate Exchange and Office 365 environments effortlessly.",
  },
  {
    provider: "mail163",
    name: "163 Mail",
    iconClass: "netease-mark",
    description:
      "Link your NetEase 163 account for complete regional coverage.",
  },
];

interface PageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function MailboxesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/mailboxes");
  }

  const mailboxes = await getUserMailboxes(user.id);
  const { error, success } = await searchParams;

  const recentSyncLogs = new Map<string, Awaited<ReturnType<typeof getRecentSyncLogs>>>();
  for (const mb of mailboxes) {
    if (mb.provider === "mail163" || mb.provider === "gmail" || mb.provider === "outlook") {
      const logs = await getRecentSyncLogs(user.id, mb.id, 3);
      if (logs.length > 0) recentSyncLogs.set(mb.id, logs);
    }
  }

  const gmailSyncAuthorized = new Map<string, boolean>();
  for (const mb of mailboxes) {
    if (mb.provider === "gmail") {
      const scope = await getMailboxCredential(user.id, mb.id, "oauth_granted_scope");
      gmailSyncAuthorized.set(mb.id, scope ? hasGmailReadonlyScope(scope) : false);
    }
  }

  const outlookSyncAuthorized = new Map<string, boolean>();
  for (const mb of mailboxes) {
    if (mb.provider === "outlook") {
      const scope = await getMailboxCredential(user.id, mb.id, "oauth_granted_scope");
      outlookSyncAuthorized.set(mb.id, scope ? hasMailReadScope(scope) : false);
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
        <div className="w-full max-w-[1056px]">
          <header className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
            <h1 className="gradient-text font-display text-[44px] font-extrabold leading-[1.2] md:text-[64px] md:leading-[1.1]">
              Connect Your World
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Bind your external email providers to AetherMail to experience a
              unified, weightless inbox.
            </p>
          </header>

          {error && (
            <div className="mx-auto mb-8 max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mx-auto mb-8 max-w-lg rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-sm text-green-700">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {PROVIDER_CARDS.map((pc) => {
              const mailbox = mailboxes.find(
                (mb) => mb.provider === pc.provider,
              );
              const connected = !!mailbox;

              return (
                <article
                  className={`glass-card group hover-lift relative flex min-h-[320px] flex-col items-center overflow-hidden rounded-xl p-8 text-center ${
                    connected ? "" : "opacity-90"
                  }`}
                  key={pc.provider}
                >
                  {!connected ? (
                    <Link
                      aria-label={`Connect ${pc.name}`}
                      className="absolute inset-0 z-20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                      href={`/mailboxes/connect?provider=${pc.provider}`}
                    />
                  ) : null}
                  <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition group-hover:opacity-100" />
                  <div
                    className={`absolute right-4 top-4 flex items-center gap-2 ${
                      connected ? "" : "opacity-60"
                    }`}
                  >
                    <span
                      className={`font-label text-[10px] font-semibold uppercase tracking-wider ${
                        connected ? "text-primary" : "text-slate-600"
                      }`}
                    >
                      {connected ? "Connected" : "Not Connected"}
                    </span>
                    <span
                      className={`size-2 rounded-full ${
                        connected ? "bg-green-500" : "bg-surface-dim"
                      } ${
                        connected
                          ? "animate-[pulse-green_1.8s_ease-in-out_infinite]"
                          : ""
                      }`}
                    />
                  </div>

                  <div
                    className={`relative z-10 mb-6 flex size-20 items-center justify-center rounded-full bg-white shadow-sm transition duration-300 group-hover:scale-110 ${
                      connected ? "" : "grayscale group-hover:grayscale-0"
                    }`}
                  >
                    <span className={`provider-logo ${pc.iconClass}`} />
                  </div>

                  <h3 className="mb-2 font-display text-2xl font-bold text-slate-950">
                    {pc.name}
                  </h3>

                  {connected && mailbox ? (
                    <>
                      <p className="mb-1 text-base font-medium text-slate-800">
                        {mailbox.address}
                      </p>
                      <p className="mb-1 text-sm capitalize text-slate-500">
                        Status: {mailbox.status}
                      </p>
                      {(mailbox.provider === "mail163" || mailbox.provider === "gmail" || mailbox.provider === "outlook") &&
                        recentSyncLogs.has(mailbox.id) && (
                          <div className="mb-4 w-full text-left">
                            <span className="font-label text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Recent Activity
                            </span>
                            <div className="mt-1 space-y-1">
                              {recentSyncLogs.get(mailbox.id)!.map((log) => (
                                <div
                                  key={log.id}
                                  className="flex items-start gap-2 rounded-md bg-white/50 px-2 py-1.5 text-xs"
                                >
                                  <span
                                    className={`mt-0.5 size-1.5 shrink-0 rounded-full ${
                                      log.status === "success"
                                        ? "bg-green-500"
                                        : "bg-red-400"
                                    }`}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-slate-600">
                                      {log.message}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      {log.finishedAt?.toLocaleString() ??
                                        log.startedAt.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      <div className="mt-auto flex w-full flex-col gap-2">
                        {mailbox.provider === "mail163" && (
                          <>
                            <form action={syncMailboxAction}>
                              <input
                                name="mailboxId"
                                type="hidden"
                                value={mailbox.id}
                              />
                              <button
                                className="vibrant-flux w-full rounded-full px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white"
                                type="submit"
                              >
                                Sync Now
                              </button>
                            </form>
                            <form action={testMailboxConnectionAction}>
                              <input
                                name="mailboxId"
                                type="hidden"
                                value={mailbox.id}
                              />
                              <button
                                className="w-full rounded-full border border-primary/30 px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-primary hover:bg-primary/5"
                                type="submit"
                              >
                                Test Connection
                              </button>
                            </form>
                          </>
                        )}
                        {mailbox.provider === "gmail" && (
                          <>
                            {gmailSyncAuthorized.get(mailbox.id) ? (
                              <form action={syncGmailAction}>
                                <input
                                  name="mailboxId"
                                  type="hidden"
                                  value={mailbox.id}
                                />
                                <button
                                  className="vibrant-flux w-full rounded-full px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white"
                                  type="submit"
                                >
                                  Sync Now
                                </button>
                              </form>
                            ) : (
                              <div className="w-full">
                                <button
                                  className="w-full cursor-not-allowed rounded-full border border-slate-300 px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-400"
                                  disabled
                                  type="button"
                                >
                                  Sync Now
                                </button>
                                <p className="mt-1 text-[11px] leading-relaxed text-amber-600">
                                  Gmail inbox access not yet authorized. Click
                                  Authorize Sync below, then try again.
                                </p>
                              </div>
                            )}
                            <form action={testGmailConnectionAction}>
                              <input
                                name="mailboxId"
                                type="hidden"
                                value={mailbox.id}
                              />
                              <button
                                className="w-full rounded-full border border-primary/30 px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-primary hover:bg-primary/5"
                                type="submit"
                              >
                                Test Connection
                              </button>
                            </form>
                            <Link
                              className="block w-full rounded-full border border-slate-300 px-6 py-2 text-center font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-600 hover:bg-white/60"
                              href="/api/auth/gmail/start?scope=gmail"
                            >
                              {gmailSyncAuthorized.get(mailbox.id)
                                ? "Re-authorize Sync"
                                : "Authorize Sync"}
                            </Link>
                          </>
                        )}
                        {mailbox.provider === "outlook" && (
                          <>
                            {outlookSyncAuthorized.get(mailbox.id) ? (
                              <form action={syncOutlookAction}>
                                <input
                                  name="mailboxId"
                                  type="hidden"
                                  value={mailbox.id}
                                />
                                <button
                                  className="vibrant-flux w-full rounded-full px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white"
                                  type="submit"
                                >
                                  Sync Now
                                </button>
                              </form>
                            ) : (
                              <div className="w-full">
                                <button
                                  className="w-full cursor-not-allowed rounded-full border border-slate-300 px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-400"
                                  disabled
                                  type="button"
                                >
                                  Sync Now
                                </button>
                                <p className="mt-1 text-[11px] leading-relaxed text-amber-600">
                                  Outlook mail access not yet authorized. Click
                                  Authorize Sync below, then try again.
                                </p>
                              </div>
                            )}
                            <form action={testOutlookConnectionAction}>
                              <input
                                name="mailboxId"
                                type="hidden"
                                value={mailbox.id}
                              />
                              <button
                                className="w-full rounded-full border border-primary/30 px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-primary hover:bg-primary/5"
                                type="submit"
                              >
                                Test Connection
                              </button>
                            </form>
                            <Link
                              className="block w-full rounded-full border border-slate-300 px-6 py-2 text-center font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-600 hover:bg-white/60"
                              href="/api/auth/outlook/start?scope=mail"
                            >
                              {outlookSyncAuthorized.get(mailbox.id)
                                ? "Re-authorize Sync"
                                : "Authorize Sync"}
                            </Link>
                          </>
                        )}
                        <form action={deleteMailboxAction}>
                          <input
                            name="mailboxId"
                            type="hidden"
                            value={mailbox.id}
                          />
                          <button
                            className="w-full rounded-full border border-red-400 px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-red-600 hover:bg-red-50"
                            type="submit"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mb-6 text-base leading-relaxed text-slate-600 opacity-80">
                        {pc.description}
                      </p>
                      <Link
                        className="vibrant-flux hover-lift relative z-30 mt-auto block w-full rounded-full px-6 py-2 text-center font-label text-xs font-semibold uppercase tracking-[0.1em] text-white"
                        href={`/mailboxes/connect?provider=${pc.provider}`}
                      >
                        Connect
                      </Link>
                    </>
                  )}
                </article>
              );
            })}
          </div>
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
