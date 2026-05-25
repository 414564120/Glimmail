import { SymbolIcon } from "./aether-icons";

const mainItems = [
  ["inbox", "收件箱", "/inbox"],
  ["hub", "账号", "/mailboxes"],
  ["star", "星标", "/inbox?view=starred"],
  ["send", "已发送", "/inbox?view=sent"],
  ["drafts", "草稿", "/inbox?view=drafts"],
] as const;

const bottomItems = [
  ["archive", "归档", "/inbox?view=archive"],
  ["delete", "废纸篓", "/inbox?view=trash"],
  ["settings", "设置", "/settings"],
] as const;

const activeLabelAliases: Record<string, string> = {
  Accounts: "账号",
  Archive: "归档",
  Drafts: "草稿",
  Inbox: "收件箱",
  Mail: "收件箱",
  Search: "搜索",
  Sent: "已发送",
  Settings: "设置",
  Starred: "星标",
  Trash: "废纸篓",
};

function isActiveLabel(active: string, label: string) {
  return active === label || activeLabelAliases[active] === label;
}

export function AetherSidebar({
  active = "收件箱",
  connectedAccountCount = 0,
}: {
  active?: string;
  connectedAccountCount?: number;
}) {
  return (
    <aside className="glass-card fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-white/40 bg-white/35 md:flex">
      <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
        <div className="mb-8 font-display text-[32px] font-extrabold leading-[1.3] tracking-tight text-primary">
          Glimmail
        </div>

        <div className="mb-8 mt-4 px-4">
          <h2 className="mb-1 font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
            统一收件箱
          </h2>
          <p className="text-xs text-outline">
            已连接 {connectedAccountCount} 个账号
          </p>
        </div>

        <a
          className="vibrant-flux hover-lift mb-8 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-[0_0_20px_rgba(168,0,170,0.3)]"
          href="/inbox?compose=new"
        >
          <SymbolIcon className="text-[20px]">edit</SymbolIcon>
          写邮件
        </a>

        <nav className="space-y-2">
          {mainItems.map(([icon, label, href]) => {
            const isActive = isActiveLabel(active, label);

            return (
              <a
                className={`hover-lift flex items-center gap-4 rounded-xl px-4 py-3 ${
                  isActive
                    ? "bg-primary-container text-[#59005a]"
                    : "text-slate-600 hover:bg-surface-container-high"
                }`}
                href={href}
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
        {bottomItems.map(([icon, label, href]) => {
          const isActive = isActiveLabel(active, label);

          return (
            <a
              className={`hover-lift flex items-center gap-4 rounded-xl px-4 py-3 ${
                isActive
                  ? "bg-primary-container text-[#59005a]"
                  : "text-slate-600 hover:bg-surface-container-high"
              }`}
              href={href}
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
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  return (
    <header className="glass-card fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/40 px-4 md:hidden">
      <div className="font-display text-[28px] font-extrabold leading-[1.3] tracking-tight text-primary">
        Glimmail
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

type MobileNavItem = readonly [string, string];

const mobileHrefByLabel: Record<string, string> = {
  Accounts: "/mailboxes",
  Inbox: "/inbox",
  Mail: "/inbox",
  Search: "/inbox?view=search",
  Settings: "/settings",
  Starred: "/inbox?view=starred",
  Sent: "/inbox?view=sent",
  Drafts: "/inbox?view=drafts",
  账号: "/mailboxes",
  收件箱: "/inbox",
  搜索: "/inbox?view=search",
  设置: "/settings",
  星标: "/inbox?view=starred",
  已发送: "/inbox?view=sent",
  草稿: "/inbox?view=drafts",
};

export function MobileBottomNav({
  active = "收件箱",
  items = [
    ["inbox", "收件箱"],
    ["star", "星标"],
    ["send", "已发送"],
    ["drafts", "草稿"],
  ] as const,
}: {
  active?: string;
  items?: readonly MobileNavItem[];
}) {
  return (
    <nav className="glass-card fixed bottom-0 z-50 grid h-20 w-full grid-cols-4 rounded-t-xl border-t border-white/40 px-2 py-2 shadow-lg md:hidden">
      {items.map(([icon, label]) => {
        const isActive = isActiveLabel(active, label);

        return (
          <a
            className={`mx-auto flex h-16 min-w-16 flex-col items-center justify-center gap-1 rounded-full px-3 font-label text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
              isActive
                ? "scale-105 bg-secondary-container/20 text-primary"
                : "text-slate-500 hover:text-primary"
            }`}
            href={mobileHrefByLabel[label] ?? "/inbox"}
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
