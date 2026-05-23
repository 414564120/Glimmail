import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AetherSidebar,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/shell/aether-sidebar";
import { SymbolIcon } from "@/components/shell/aether-icons";
import { CopyCodeButton } from "@/components/inbox/copy-code-button";
import { getCurrentUser } from "@/modules/auth";
import { getUserMessages } from "@/modules/messages";
import { toggleReadAction, toggleStarredAction } from "./actions";

function formatMessageTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24)
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

interface PageProps {
  searchParams: Promise<{ message?: string }>;
}

export default async function InboxPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/inbox");
  }

  const messages = await getUserMessages(user.id);
  const { message: messageIdParam } = await searchParams;

  const selectedMessage = messageIdParam
    ? messages.find((m) => m.id === messageIdParam) ?? messages[0] ?? null
    : messages[0] ?? null;

  return (
    <main className="surface-grid min-h-screen bg-background text-slate-950">
      <MobileTopBar />
      <AetherSidebar active="Inbox" />

      <section className="min-h-screen overflow-x-hidden pb-20 pt-16 md:ml-64 md:pb-0 md:pt-0">
        <header className="glass-card sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-white/40 px-12 md:flex">
          <label className="group relative w-96">
            <span className="sr-only">Search mail</span>
            <SymbolIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[22px] text-slate-600">
              search
            </SymbolIcon>
            <input
              className="w-full rounded-full border border-white/40 bg-surface-container-highest py-2 pl-10 pr-4 text-base outline-none transition-shadow duration-300 focus:ring-2 focus:ring-secondary-container"
              placeholder="Search mail, people, or settings..."
              type="text"
            />
          </label>

          <div className="flex items-center gap-4 text-slate-700">
            {["light_mode", "notifications", "settings"].map((icon) => (
              <button
                className="flex size-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-surface-container-high hover:text-primary"
                key={icon}
                type="button"
              >
                <SymbolIcon className="text-[22px]">{icon}</SymbolIcon>
              </button>
            ))}
            <div className="size-10 overflow-hidden rounded-full border-2 border-white shadow-sm">
              <div className="h-full w-full bg-gradient-to-br from-primary-container to-secondary-container" />
            </div>
          </div>
        </header>

        <div className="grid min-h-[calc(100vh-64px)] min-w-0 grid-cols-1 md:grid-cols-[400px_minmax(0,1fr)]">
          <aside className="custom-scrollbar min-w-0 border-r border-white/40 bg-white/35 backdrop-blur-md md:h-[calc(100vh-64px)] md:overflow-y-auto">
            <div className="z-10 flex items-center justify-between border-b border-white/60 bg-white/95 p-4 shadow-[0_8px_24px_rgba(49,57,74,0.04)] backdrop-blur-md md:sticky md:top-0 md:bg-white/60">
              <h2 className="font-display text-[28px] font-bold leading-[1.3] text-slate-950">
                Inbox
              </h2>
              <button
                className="flex size-10 items-center justify-center rounded-full transition hover:bg-surface-container-high"
                type="button"
              >
                <SymbolIcon className="text-[22px] text-slate-600">
                  filter_list
                </SymbolIcon>
              </button>
            </div>

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
                <SymbolIcon className="mb-4 text-[48px] text-slate-400">
                  mail
                </SymbolIcon>
                <p className="font-display text-lg font-semibold text-slate-500">
                  No messages yet
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Connect a mailbox and sync to see messages here.
                </p>
              </div>
            ) : (
              <div>
                {messages.map((msg) => {
                  const isActive = selectedMessage?.id === msg.id;
                  const isUnread = !msg.isRead;
                  const hasVerification = !!msg.verificationCode;

                  return (
                    <Link
                      className={`block cursor-pointer border-b border-white/35 p-4 transition ${
                        isActive
                          ? "bg-white/80 shadow-[inset_4px_0_0_var(--primary)]"
                          : "bg-white/20 hover:bg-white/45"
                      }`}
                      href={`/inbox?message=${encodeURIComponent(msg.id)}`}
                      key={msg.id}
                      scroll={false}
                    >
                      <div className="mb-1 flex items-start justify-between gap-4">
                        <span
                          className={`font-label text-xs uppercase tracking-[0.1em] text-slate-950 ${
                            isUnread ? "font-bold" : "font-medium text-slate-600"
                          }`}
                        >
                          {msg.sender}
                        </span>
                        <span
                          className={`shrink-0 text-[10px] ${
                            isActive ? "text-primary" : "text-slate-500"
                          }`}
                        >
                          {formatMessageTime(msg.receivedAt)}
                        </span>
                      </div>
                      <h3
                        className={`mb-1 text-base leading-relaxed ${
                          isUnread
                            ? "font-semibold text-slate-950"
                            : "font-normal text-slate-700"
                        }`}
                      >
                        {msg.subject}
                      </h3>
                      <p className="truncate text-sm text-slate-600">
                        {msg.preview ?? "(no preview)"}
                      </p>
                      {hasVerification ? (
                        <div className="mt-3 inline-flex rounded bg-primary-container/30 px-2 py-1 font-label text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
                          Verification
                        </div>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            )}
          </aside>

          {selectedMessage ? (
            <article className="relative hidden h-[calc(100vh-64px)] min-w-0 overflow-hidden bg-white/20 md:block">
              <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-96 w-96 rounded-full bg-primary-container/20 blur-[100px]" />
              <header className="glass-card-soft relative z-[1] flex items-start justify-between gap-6 border-b border-white/40 p-6">
                <div>
                  <h1 className="mb-2 break-words font-display text-[42px] font-bold leading-[1.16] text-slate-950">
                    {selectedMessage.subject}
                  </h1>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-secondary-container font-label text-xs font-bold text-white">
                      {getInitials(selectedMessage.sender)}
                    </div>
                    <div>
                      <div className="font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-950">
                        {selectedMessage.sender}{" "}
                        <span className="font-normal normal-case tracking-normal text-slate-600">
                          &lt;{selectedMessage.sender.toLowerCase().replace(/\s+/g, "")}
                          @mail.com&gt;
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        To: me &bull;{" "}
                        {selectedMessage.receivedAt.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {selectedMessage.receivedAt.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <form action={toggleStarredAction}>
                    <input
                      name="messageId"
                      type="hidden"
                      value={selectedMessage.id}
                    />
                    <button
                      className="flex size-10 items-center justify-center rounded-full transition hover:bg-surface-container-high"
                      title={selectedMessage.isStarred ? "Unstar" : "Star"}
                      type="submit"
                    >
                      <SymbolIcon
                        className={`text-[22px] ${
                          selectedMessage.isStarred
                            ? "text-amber-500"
                            : "text-slate-600"
                        }`}
                      >
                        {selectedMessage.isStarred ? "star" : "star_border"}
                      </SymbolIcon>
                    </button>
                  </form>
                  <form action={toggleReadAction}>
                    <input
                      name="messageId"
                      type="hidden"
                      value={selectedMessage.id}
                    />
                    <button
                      className="flex size-10 items-center justify-center rounded-full transition hover:bg-surface-container-high"
                      title={
                        selectedMessage.isRead
                          ? "Mark as unread"
                          : "Mark as read"
                      }
                      type="submit"
                    >
                      <SymbolIcon className="text-[22px] text-slate-600">
                        {selectedMessage.isRead ? "drafts" : "mail"}
                      </SymbolIcon>
                    </button>
                  </form>
                  <button
                    className="flex size-10 items-center justify-center rounded-full transition hover:bg-surface-container-high"
                    type="button"
                  >
                    <SymbolIcon className="text-[22px] text-slate-600">
                      more_vert
                    </SymbolIcon>
                  </button>
                </div>
              </header>

              <div className="custom-scrollbar relative z-[1] h-[calc(100%-145px)] overflow-y-auto p-8">
                <div className="glass-card-soft mx-auto max-w-2xl overflow-hidden rounded-2xl p-8">
                  <div className="mb-8 h-1 w-full rounded-full bg-gradient-to-r from-primary via-tertiary to-secondary-container" />

                  {selectedMessage.bodyText ? (
                    <div>
                      {selectedMessage.bodyText
                        .split("\n")
                        .filter(Boolean)
                        .map((paragraph, i) => (
                          <p
                            className={`text-base leading-relaxed text-slate-950 ${
                              i > 0 ? "mb-8" : "mb-6"
                            }`}
                            key={i}
                          >
                            {paragraph}
                          </p>
                        ))}
                    </div>
                  ) : (
                    <p className="mb-6 text-base leading-relaxed text-slate-600">
                      {selectedMessage.preview ?? "No content."}
                    </p>
                  )}

                  {selectedMessage.verificationCode ? (
                    <div className="mb-8 rounded-xl border border-white/40 bg-surface-container-low p-6 text-center shadow-sm">
                      <div className="mb-4 font-display text-[64px] font-extrabold leading-[1.1] tracking-[0.2em] text-tertiary">
                        {selectedMessage.verificationCode}
                      </div>
                      <CopyCodeButton code={selectedMessage.verificationCode} />
                    </div>
                  ) : selectedMessage.bodyText ? null : null}
                </div>
              </div>
            </article>
          ) : (
            <article className="relative hidden h-[calc(100vh-64px)] min-w-0 overflow-hidden bg-white/20 md:flex md:items-center md:justify-center">
              <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-96 w-96 rounded-full bg-primary-container/20 blur-[100px]" />
              <p className="relative z-10 text-lg text-slate-400">
                Select a message to read
              </p>
            </article>
          )}
        </div>
      </section>

      <button
        className="vibrant-flux hover-lift fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full text-white shadow-[0_0_20px_rgba(168,0,170,0.3)] md:hidden"
        type="button"
      >
        <SymbolIcon className="text-[24px]">edit</SymbolIcon>
      </button>
      <MobileBottomNav />
    </main>
  );
}
