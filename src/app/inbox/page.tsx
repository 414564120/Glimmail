import {
  AetherSidebar,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/shell/aether-sidebar";
import { SymbolIcon } from "@/components/shell/aether-icons";

type MessageItem = {
  active?: boolean;
  badge?: string;
  preview: string;
  sender: string;
  subject: string;
  time: string;
};

const messages: MessageItem[] = [
  {
    active: true,
    badge: "Verification",
    preview: "Please use the following code to verify your recent login attempt...",
    sender: "Security Team",
    subject: "Your AetherMail Verification Code",
    time: "Just now",
  },
  {
    preview: "Attached are the finalized UI components for the upcoming release.",
    sender: "Elena Rostova",
    subject: "Project Neon - Q3 Assets",
    time: "10:42 AM",
  },
  {
    preview: "Your weekly summary of storage and bandwidth consumption is ready.",
    sender: "Cloud Services",
    subject: "Weekly Usage Report",
    time: "Yesterday",
  },
] as const;

export default function InboxPage() {
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

            <div>
              {messages.map((message) => (
                <article
                  className={`cursor-pointer border-b border-white/35 p-4 transition ${
                    message.active
                      ? "bg-white/80 shadow-[inset_4px_0_0_var(--primary)]"
                      : "bg-white/20 hover:bg-white/45"
                  }`}
                  key={message.subject}
                >
                  <div className="mb-1 flex items-start justify-between gap-4">
                    <span
                      className={`font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-950 ${
                        message.active ? "font-bold" : ""
                      }`}
                    >
                      {message.sender}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] ${
                        message.active ? "text-primary" : "text-slate-500"
                      }`}
                    >
                      {message.time}
                    </span>
                  </div>
                  <h3
                    className={`mb-1 text-base leading-relaxed text-slate-950 ${
                      message.active ? "font-semibold" : ""
                    }`}
                  >
                    {message.subject}
                  </h3>
                  <p className="truncate text-sm text-slate-600">
                    {message.preview}
                  </p>
                  {message.badge ? (
                    <div className="mt-3 inline-flex rounded bg-primary-container/30 px-2 py-1 font-label text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
                      {message.badge}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </aside>

          <article className="relative hidden h-[calc(100vh-64px)] min-w-0 overflow-hidden bg-white/20 md:block">
            <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-96 w-96 rounded-full bg-primary-container/20 blur-[100px]" />
            <header className="glass-card-soft relative z-[1] flex items-start justify-between gap-6 border-b border-white/40 p-6">
                <div>
                  <h1 className="mb-2 break-words font-display text-[42px] font-bold leading-[1.16] text-slate-950">
                    Your AetherMail Verification Code
                  </h1>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-secondary-container font-label text-xs font-bold text-white">
                      ST
                    </div>
                    <div>
                      <div className="font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-950">
                        Security Team{" "}
                        <span className="font-normal normal-case tracking-normal text-slate-600">
                          &lt;security@aethermail.com&gt;
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        To: me • Today, 11:05 AM
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-surface-container-high hover:text-primary"
                  type="button"
                >
                  <SymbolIcon className="text-[22px] text-slate-600">
                    more_vert
                  </SymbolIcon>
                </button>
              </header>

            <div className="custom-scrollbar relative z-[1] h-[calc(100%-145px)] overflow-y-auto p-8">
              <div className="glass-card-soft mx-auto max-w-2xl overflow-hidden rounded-2xl p-8">
                <div className="mb-8 h-1 w-full rounded-full bg-gradient-to-r from-primary via-tertiary to-secondary-container" />
                <div>
                  <p className="mb-6 text-lg leading-relaxed text-slate-950">
                    Hello,
                  </p>
                  <p className="mb-8 text-base leading-relaxed text-slate-950">
                    We received a request to verify your identity. Please use
                    the verification code below to complete the process. This
                    code will expire in 15 minutes.
                  </p>

                  <div className="mb-8 rounded-xl border border-white/40 bg-surface-container-low p-6 text-center shadow-sm">
                    <div className="mb-4 font-display text-[64px] font-extrabold leading-[1.1] tracking-[0.2em] text-tertiary">
                      749201
                    </div>
                    <button
                      className="vibrant-flux hover-lift mx-auto flex items-center justify-center gap-2 rounded-full px-8 py-3 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-[0_0_15px_rgba(168,0,170,0.4)]"
                      type="button"
                    >
                      <SymbolIcon className="text-[20px]">content_copy</SymbolIcon>
                      Copy Code
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
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
