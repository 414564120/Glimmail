import { SymbolIcon } from "./aether-icons";

const mainItems = [
  ["inbox", "Inbox"],
  ["star", "Starred"],
  ["send", "Sent"],
  ["drafts", "Drafts"],
] as const;

const bottomItems = [
  ["archive", "Archive"],
  ["delete", "Trash"],
] as const;

export function AetherSidebar({ active = "Inbox" }: { active?: string }) {
  return (
    <aside className="glass-card fixed left-0 top-0 z-30 hidden h-screen w-[280px] flex-col border-r border-white/40 bg-white/35 md:flex">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-8 font-display text-[32px] font-extrabold leading-[1.3] tracking-tight text-primary">
          AetherMail
        </div>

        <div className="mb-8 mt-4 px-4">
          <h2 className="mb-1 font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
            Global Inbox
          </h2>
          <p className="text-xs text-outline">4 connected accounts</p>
        </div>

        <button
          className="vibrant-flux mb-8 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-[0_0_20px_rgba(168,0,170,0.3)]"
          type="button"
        >
          <SymbolIcon className="text-[20px]">edit</SymbolIcon>
          Compose
        </button>

        <nav className="space-y-2">
          {mainItems.map(([icon, label]) => {
            const isActive = active === label;

            return (
              <a
                className={`flex items-center gap-4 rounded-xl px-4 py-3 transition ${
                  isActive
                    ? "bg-primary-container text-[#59005a]"
                    : "text-slate-600 hover:bg-surface-container-high"
                }`}
                href="#"
                key={label}
              >
                <SymbolIcon className="text-[22px]" fill={isActive}>
                  {icon}
                </SymbolIcon>
                <span
                  className={
                    isActive
                      ? "font-label text-xs font-semibold uppercase tracking-[0.1em]"
                      : "text-base"
                  }
                >
                  {label}
                </span>
              </a>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2 border-t border-white/35 p-6">
        {bottomItems.map(([icon, label]) => (
          <a
            className="flex items-center gap-4 rounded-xl px-4 py-3 text-slate-600 transition hover:bg-surface-container-high"
            href="#"
            key={label}
          >
            <SymbolIcon className="text-[22px]">{icon}</SymbolIcon>
            <span className="text-base">{label}</span>
          </a>
        ))}
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  return (
    <header className="glass-card fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/40 px-4 md:hidden">
      <div className="font-display text-[28px] font-extrabold leading-[1.3] tracking-tight text-primary">
        AetherMail
      </div>
      <div className="flex items-center gap-4 text-slate-700">
        <SymbolIcon className="text-[24px]">search</SymbolIcon>
        <div className="size-8 overflow-hidden rounded-full border-2 border-white shadow-sm">
          <div className="h-full w-full bg-gradient-to-br from-primary-container to-secondary-container" />
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const items = [
    ["inbox", "Inbox"],
    ["star", "Starred"],
    ["send", "Sent"],
    ["drafts", "Drafts"],
  ] as const;

  return (
    <nav className="glass-card fixed bottom-0 z-50 grid h-16 w-full grid-cols-4 border-t border-white/40 md:hidden">
      {items.map(([icon, label]) => {
        const isActive = label === "Inbox";

        return (
          <a
            className={`flex flex-col items-center justify-center gap-1 text-[10px] ${
              isActive ? "text-primary" : "text-slate-500"
            }`}
            href="#"
            key={label}
          >
            <SymbolIcon className="text-[22px]" fill={isActive}>
              {icon}
            </SymbolIcon>
            {label}
          </a>
        );
      })}
    </nav>
  );
}
