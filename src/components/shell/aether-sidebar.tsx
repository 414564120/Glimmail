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
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-white/10 bg-[#071412] text-[#f4f5e9] shadow-[0_28px_90px_rgba(0,0,0,0.42)] md:flex">
      <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
        <a className="mb-8 flex items-center gap-3" href="/inbox">
          <span className="grid size-11 place-items-center rounded-2xl border border-[#d7ff47]/35 bg-[#d7ff47] text-sm font-black text-[#071412]">
            GL
          </span>
          <span className="font-display text-[28px] font-extrabold leading-[1.2] tracking-tight">
            Glimmail
          </span>
        </a>

        <div className="mb-8 mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <h2 className="mb-1 font-label text-xs font-bold uppercase tracking-[0.1em] text-[#d7ff47]">
            统一收件箱
          </h2>
          <p className="text-xs text-[#f4f5e9]/58">
            已连接 {connectedAccountCount} 个账号
          </p>
        </div>

        <a
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#d7ff47] px-4 py-3 font-label text-xs font-black uppercase tracking-[0.1em] text-[#071412] transition hover:-translate-y-0.5 hover:bg-[#e4ff77] active:translate-y-0"
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
                className={`flex items-center gap-4 rounded-xl px-4 py-3 transition ${
                  isActive
                    ? "bg-[#f7f1df] text-[#111e1a]"
                    : "text-[#f4f5e9]/62 hover:bg-white/[0.06] hover:text-[#f4f5e9]"
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
                      ? "font-label text-xs font-black uppercase tracking-[0.1em]"
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

      <div className="space-y-2 border-t border-white/10 p-6">
        {bottomItems.map(([icon, label, href]) => {
          const isActive = isActiveLabel(active, label);

          return (
            <a
              className={`flex items-center gap-4 rounded-xl px-4 py-3 transition ${
                isActive
                  ? "bg-[#f7f1df] text-[#111e1a]"
                  : "text-[#f4f5e9]/62 hover:bg-white/[0.06] hover:text-[#f4f5e9]"
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
                    ? "font-label text-xs font-black uppercase tracking-[0.1em]"
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
    <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/10 bg-[#071412]/94 px-4 text-[#f4f5e9] shadow-[0_18px_42px_rgba(0,0,0,0.26)] md:hidden">
      <a className="flex items-center gap-2" href="/inbox">
        <span className="grid size-9 place-items-center rounded-xl bg-[#d7ff47] text-xs font-black text-[#071412]">
          GL
        </span>
        <span className="font-display text-[24px] font-extrabold leading-[1.2] tracking-tight">
          Glimmail
        </span>
      </a>
      <a
        aria-label="搜索邮件"
        className="grid size-10 place-items-center rounded-full border border-white/10 text-[#f4f5e9]/68 transition hover:text-[#d7ff47]"
        href="/inbox?view=search"
      >
        <SymbolIcon className="text-[22px]">search</SymbolIcon>
      </a>
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
    <nav className="fixed bottom-0 z-50 grid h-20 w-full grid-cols-4 rounded-t-3xl border-t border-white/10 bg-[#071412]/96 px-2 py-2 text-[#f4f5e9] shadow-[0_-18px_42px_rgba(0,0,0,0.28)] md:hidden">
      {items.map(([icon, label]) => {
        const isActive = isActiveLabel(active, label);

        return (
          <a
            className={`mx-auto flex h-16 min-w-16 flex-col items-center justify-center gap-1 rounded-full px-3 font-label text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
              isActive
                ? "scale-105 bg-[#f7f1df] text-[#111e1a]"
                : "text-[#f4f5e9]/58 hover:text-[#d7ff47]"
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
