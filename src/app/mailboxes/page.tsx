import { AetherSidebar, MobileBottomNav, MobileTopBar } from "@/components/shell/aether-sidebar";

const providers = [
  {
    action: "Manage Sync",
    description: "Sync your primary Google workspace and personal accounts seamlessly.",
    icon: "M",
    iconClass: "from-red-500 via-yellow-400 to-blue-500",
    name: "Gmail",
    status: "Connected",
    statusClass: "bg-green-500",
  },
  {
    action: "Connect",
    description: "Integrate Exchange and Office 365 environments effortlessly.",
    icon: "O",
    iconClass: "from-sky-500 to-blue-700",
    name: "Outlook",
    status: "Not Connected",
    statusClass: "bg-surface-dim",
  },
  {
    action: "Connect",
    description: "Link your NetEase 163 account for complete regional coverage.",
    icon: "163",
    iconClass: "from-red-500 to-rose-700",
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

      <section className="flex min-h-screen items-center justify-center px-4 pb-24 pt-24 md:ml-[280px] md:px-12 md:py-16">
        <div className="w-full max-w-[1120px]">
          <header className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
            <h1 className="bg-gradient-to-r from-primary to-tertiary bg-clip-text font-display text-[48px] font-extrabold leading-[1.2] text-transparent md:text-[64px] md:leading-[1.1]">
              Connect Your World
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Bind your external email providers to AetherMail to experience a
              unified, weightless inbox.
            </p>
          </header>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => {
              const connected = provider.status === "Connected";

              return (
                <article
                  className={`glass-card relative flex min-h-[352px] cursor-pointer flex-col items-center overflow-hidden rounded-xl p-8 text-center transition duration-300 hover:-translate-y-2 hover:shadow-[0_16px_40px_rgba(168,0,170,0.16)] ${
                    connected ? "" : "opacity-90"
                  }`}
                  key={provider.name}
                >
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
                        connected ? "shadow-[0_0_12px_rgba(34,197,94,0.8)]" : ""
                      }`}
                    />
                  </div>

                  <div
                    className={`relative z-10 mb-6 flex size-20 items-center justify-center rounded-full bg-white shadow-sm transition duration-300 group-hover:scale-110 ${
                      connected ? "" : "grayscale"
                    }`}
                  >
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${provider.iconClass} font-display text-lg font-extrabold text-white shadow-sm`}
                    >
                      {provider.icon}
                    </div>
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
                        ? "mt-auto w-full rounded-full border border-primary px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-primary transition hover:bg-primary-container/10"
                        : "vibrant-flux mt-auto w-full rounded-full px-6 py-2 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white"
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

      <MobileBottomNav />
    </main>
  );
}
