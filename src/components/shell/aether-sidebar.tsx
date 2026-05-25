const mainItems = [
  ["统一收件箱", "IN", "/inbox"],
  ["重要", "P1", "/inbox?view=important"],
  ["验证码", "VC", "/inbox?view=codes"],
  ["通知", "NT", "/inbox?view=notifications"],
  ["订阅", "RD", "/inbox?view=subscriptions"],
  ["星标", "ST", "/inbox?view=starred"],
] as const;

const bottomItems = [
  ["账号", "AC", "/mailboxes"],
  ["设置", "SG", "/settings"],
] as const;

const activeLabelAliases: Record<string, string> = {
  Accounts: "账号",
  Archive: "归档",
  Codes: "验证码",
  Drafts: "草稿",
  Inbox: "统一收件箱",
  Important: "重要",
  Mail: "统一收件箱",
  Notifications: "通知",
  Read: "订阅",
  Search: "搜索",
  Sent: "已发送",
  Settings: "设置",
  Starred: "星标",
  Subscriptions: "订阅",
  Trash: "废纸篓",
  收件箱: "统一收件箱",
};

function isActiveLabel(active: string, label: string) {
  return active === label || activeLabelAliases[active] === label;
}

export function AetherSidebar({
  active = "统一收件箱",
}: {
  active?: string;
  connectedAccountCount?: number;
}) {
  return (
    <aside className="fixed bottom-[14px] left-[14px] top-[14px] z-40 hidden w-[92px] flex-col items-center overflow-hidden rounded-[22px] border border-white/10 bg-[#071412]/75 px-[10px] py-[14px] text-[#f4f5e9] shadow-[0_28px_90px_rgba(0,0,0,0.42)] md:flex">
      <a
        className="grid h-[54px] w-[54px] place-items-center"
        href="/inbox"
        title="Glimmail"
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-[18px] border border-[#d7ff47]/35 bg-[#d7ff47] text-sm font-black text-[#071412] shadow-[0_18px_42px_rgba(215,255,71,0.16)]">
          GM
        </span>
      </a>

      <nav className="mt-7 grid gap-[10px]">
        {mainItems.map(([label, shortLabel, href]) => {
          const isActive = isActiveLabel(active, label);

          return (
            <a
              className={`grid h-12 w-12 place-items-center rounded-2xl border text-[11px] font-black tracking-[0.04em] transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
                isActive
                  ? "border-transparent bg-[#f7f1df] shadow-[0_16px_38px_rgba(247,241,223,0.14)]"
                  : "border-transparent bg-transparent hover:border-white/15 hover:bg-white/[0.06]"
              }`}
              href={href}
              key={label}
              style={{
                color: isActive ? "#111e1a" : "rgba(244,245,233,0.68)",
              }}
              title={label}
            >
              {shortLabel}
            </a>
          );
        })}
      </nav>

      <div className="mt-auto grid gap-[10px]">
        {bottomItems.map(([label, shortLabel, href]) => {
          const isActive = isActiveLabel(active, label);

          return (
            <a
              className={`grid h-12 w-12 place-items-center rounded-2xl border text-[11px] font-black tracking-[0.04em] transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
                isActive
                  ? "border-transparent bg-[#f7f1df] shadow-[0_16px_38px_rgba(247,241,223,0.14)]"
                  : "border-transparent bg-transparent hover:border-white/15 hover:bg-white/[0.06]"
              }`}
              href={href}
              key={label}
              style={{
                color: isActive ? "#111e1a" : "rgba(244,245,233,0.68)",
              }}
              title={label}
            >
              {shortLabel}
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
          GM
        </span>
        <span className="font-display text-[24px] font-extrabold leading-[1.2] tracking-tight">
          Glimmail
        </span>
      </a>
      <a
        aria-label="搜索邮件"
        className="grid h-10 place-items-center rounded-full border border-white/10 px-3 text-[11px] font-black tracking-[0.04em] text-[#f4f5e9]/68 transition hover:text-[#d7ff47]"
        href="/inbox?view=search"
      >
        搜索
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
  统一收件箱: "/inbox",
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
      {items.map(([, label]) => {
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
            {label}
          </a>
        );
      })}
    </nav>
  );
}
