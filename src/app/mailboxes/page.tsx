import {
  AetherSidebar,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/shell/aether-sidebar";

const providers = [
  {
    action: "Manage Sync",
    description: "Sync your primary Google workspace and personal accounts seamlessly.",
    iconClass: "gmail-mark",
    name: "Gmail",
    status: "Connected",
    statusClass: "bg-green-500",
  },
  {
    action: "Connect",
    description: "Integrate Exchange and Office 365 environments effortlessly.",
    iconClass: "outlook-mark",
    name: "Outlook",
    status: "Not Connected",
    statusClass: "bg-surface-dim",
  },
  {
    action: "Connect",
    description: "Link your NetEase 163 account for complete regional coverage.",
    iconClass: "netease-mark",
    name: "163 Mail",
    status: "Not Connected",
    statusClass: "bg-surface-dim",
  },
] as const;

export default function MailboxesPage() {
  return (
    <main className="surface-grid min-h-screen bg-background text-slate-950">
      <MobileTopBar />
      <AetherSidebar active="Inbox" />

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

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {providers.map((provider) => {
              const connected = provider.status === "Connected";

              return (
                <article
                  className={`glass-card group hover-lift relative flex min-h-[320px] cursor-pointer flex-col items-center overflow-hidden rounded-xl p-8 text-center ${
                    connected ? "" : "opacity-90"
                  }`}
                  key={provider.name}
                >
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
                      {provider.status}
                    </span>
                    <span
                      className={`size-2 rounded-full ${provider.statusClass} ${
                        connected ? "animate-[pulse-green_1.8s_ease-in-out_infinite]" : ""
                      }`}
                    />
                  </div>

                  <div
                    className={`relative z-10 mb-6 flex size-20 items-center justify-center rounded-full bg-white shadow-sm transition duration-300 group-hover:scale-110 ${
                      connected ? "" : "grayscale group-hover:grayscale-0"
                    }`}
                  >
                    <span className={`provider-logo ${provider.iconClass}`} />
                  </div>

                  <h3 className="mb-2 font-display text-2xl font-bold text-slate-950">
                    {provider.name}
                  </h3>
                  <p className="mb-8 text-base leading-relaxed text-slate-600 opacity-80">
                    {provider.description}
                  </p>
                  <button
                    className={
                      connected
                        ? "hover-lift mt-auto w-full rounded-full border border-primary px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-primary hover:bg-primary-container/10"
                        : "vibrant-flux hover-lift mt-auto w-full rounded-full px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white"
                    }
                    type="button"
                  >
                    {provider.action}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <MobileBottomNav
        active="Settings"
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
