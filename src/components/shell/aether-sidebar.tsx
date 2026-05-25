import { SymbolIcon } from "./aether-icons";

const mainItems = [
  ["inbox", "收件箱", "IN", "/inbox"],
  ["hub", "账号", "AC", "/mailboxes"],
  ["star", "星标", "ST", "/inbox?view=starred"],
  ["send", "已发送", "SE", "/inbox?view=sent"],
  ["drafts", "草稿", "DR", "/inbox?view=drafts"],
] as const;

const bottomItems = [
  ["archive", "归档", "AR", "/inbox?view=archive"],
  ["delete", "废纸篓", "TR", "/inbox?view=trash"],
  ["settings", "设置", "SG", "/settings"],
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
    <aside className="group/sidebar fixed bottom-3 left-3 top-3 z-40 hidden w-[92px] flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#071412]/96 text-[#f4f5e9] shadow-[0_28px_90px_rgba(0,0,0,0.42)] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:w-[240px] md:flex">
      <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-4">
        <a className="mb-8 flex h-14 items-center gap-3" href="/inbox">
          <span className="grid size-14 shrink-0 place-items-center rounded-[18px] border border-[#d7ff47]/35 bg-[#d7ff47] text-sm font-black text-[#071412] shadow-[0_18px_42px_rgba(215,255,71,0.16)]">
            GL
          </span>
          <span className="max-w-0 overflow-hidden whitespace-nowrap font-display text-[26px] font-extrabold leading-[1.2] tracking-tight opacity-0 transition-[max-width,opacity] duration-300 group-hover/sidebar:max-w-36 group-hover/sidebar:opacity-100">
            Glimmail
          </span>
        </a>

        <div className="mb-8 mt-4 max-h-0 overflow-hidden rounded-2xl border border-transparent bg-white/[0.04] px-3 py-0 opacity-0 transition-[max-height,opacity,padding,border-color] duration-300 group-hover/sidebar:max-h-24 group-hover/sidebar:border-white/10 group-hover/sidebar:py-3 group-hover/sidebar:opacity-100">
          <h2 className="mb-1 whitespace-nowrap font-label text-xs font-bold uppercase tracking-[0.1em] text-[#d7ff47]">
            统一收件箱
          </h2>
          <p className="whitespace-nowrap text-xs text-[#f4f5e9]/58">
            已连接 {connectedAccountCount} 个账号
          </p>
        </div>

        <a
          className="mb-8 flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#d7ff47] px-0 font-label text-xs font-black uppercase tracking-[0.1em] text-[#071412] transition hover:-translate-y-0.5 hover:bg-[#e4ff77] active:translate-y-0 group-hover/sidebar:justify-start group-hover/sidebar:px-4"
          href="/inbox?compose=new"
          title="写邮件"
        >
          <SymbolIcon className="shrink-0 text-[20px]">edit</SymbolIcon>
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity] duration-300 group-hover/sidebar:max-w-20 group-hover/sidebar:opacity-100">
            写邮件
          </span>
        </a>

        <nav className="space-y-2">
          {mainItems.map(([icon, label, shortLabel, href]) => {
            const isActive = isActiveLabel(active, label);

            return (
              <a
                className={`flex h-12 items-center justify-center gap-3 rounded-2xl px-0 transition group-hover/sidebar:justify-start group-hover/sidebar:px-4 ${
                  isActive
                    ? "bg-[#f7f1df] text-[#111e1a]"
                    : "text-[#f4f5e9]/62 hover:bg-white/[0.06] hover:text-[#f4f5e9]"
                }`}
                href={href}
                key={label}
                title={label}
              >
                <SymbolIcon className="shrink-0 text-[22px]" fill={isActive}>
                  {icon}
                </SymbolIcon>
                <span
                  className={
                    isActive
                      ? "font-label text-xs font-black uppercase tracking-[0.1em] transition-[max-width,opacity] duration-300 group-hover/sidebar:max-w-0 group-hover/sidebar:opacity-0"
                      : "font-label text-xs font-bold uppercase tracking-[0.1em] transition-[max-width,opacity] duration-300 group-hover/sidebar:max-w-0 group-hover/sidebar:opacity-0"
                  }
                >
                  {shortLabel}
                </span>
                <span
                  className={
                    isActive
                      ? "max-w-0 overflow-hidden whitespace-nowrap font-label text-xs font-black uppercase tracking-[0.1em] opacity-0 transition-[max-width,opacity] duration-300 group-hover/sidebar:max-w-24 group-hover/sidebar:opacity-100"
                      : "max-w-0 overflow-hidden whitespace-nowrap text-sm opacity-0 transition-[max-width,opacity] duration-300 group-hover/sidebar:max-w-24 group-hover/sidebar:opacity-100"
                  }
                >
                  {label}
                </span>
              </a>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2 border-t border-white/10 px-5 py-4">
        {bottomItems.map(([icon, label, shortLabel, href]) => {
          const isActive = isActiveLabel(active, label);

          return (
            <a
              className={`flex h-12 items-center justify-center gap-3 rounded-2xl px-0 transition group-hover/sidebar:justify-start group-hover/sidebar:px-4 ${
                isActive
                  ? "bg-[#f7f1df] text-[#111e1a]"
                  : "text-[#f4f5e9]/62 hover:bg-white/[0.06] hover:text-[#f4f5e9]"
              }`}
              href={href}
              key={label}
              title={label}
            >
              <SymbolIcon className="shrink-0 text-[22px]" fill={isActive}>
                {icon}
              </SymbolIcon>
              <span
                className={
                  isActive
                    ? "font-label text-xs font-black uppercase tracking-[0.1em] transition-[max-width,opacity] duration-300 group-hover/sidebar:max-w-0 group-hover/sidebar:opacity-0"
                    : "font-label text-xs font-bold uppercase tracking-[0.1em] transition-[max-width,opacity] duration-300 group-hover/sidebar:max-w-0 group-hover/sidebar:opacity-0"
                }
              >
                {shortLabel}
              </span>
              <span
                className={
                  isActive
                    ? "max-w-0 overflow-hidden whitespace-nowrap font-label text-xs font-black uppercase tracking-[0.1em] opacity-0 transition-[max-width,opacity] duration-300 group-hover/sidebar:max-w-24 group-hover/sidebar:opacity-100"
                    : "max-w-0 overflow-hidden whitespace-nowrap text-sm opacity-0 transition-[max-width,opacity] duration-300 group-hover/sidebar:max-w-24 group-hover/sidebar:opacity-100"
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
