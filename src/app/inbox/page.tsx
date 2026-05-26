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
import { getUserMailboxes } from "@/modules/mailboxes";
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

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  mail163: "163 邮箱",
};

function getProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

function getProviderTone(provider: string) {
  if (provider === "outlook") return "bg-[#4fd7ff]";
  if (provider === "mail163") return "bg-[#ff6b57]";
  return "bg-[#5df08f]";
}

function getProviderItemClass(provider: string) {
  if (provider === "outlook") return "before:bg-[#4fd7ff]";
  if (provider === "mail163") return "before:bg-[#ff6b57]";
  return "before:bg-[#87f2c5]";
}

const viewLabels = {
  archive: "归档",
  drafts: "草稿",
  inbox: "统一收件箱",
  search: "搜索",
  sent: "已发送",
  starred: "星标",
  trash: "废纸篓",
} as const;

type InboxView = keyof typeof viewLabels;

function getInboxView(value?: string): InboxView {
  if (value && value in viewLabels) {
    return value as InboxView;
  }

  return "inbox";
}

function getViewMessages<T extends { isStarred: boolean }>(
  messages: T[],
  view: InboxView,
) {
  if (view === "starred") return messages.filter((msg) => msg.isStarred);
  if (view === "inbox") return messages;

  return [];
}

interface PageProps {
  searchParams: Promise<{ compose?: string; message?: string; view?: string }>;
}

export default async function InboxPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/inbox");
  }

  const [messages, mailboxes] = await Promise.all([
    getUserMessages(user.id),
    getUserMailboxes(user.id),
  ]);
  const {
    compose: composeParam,
    message: messageIdParam,
    view: viewParam,
  } = await searchParams;
  const activeView = getInboxView(viewParam);
  const visibleMessages = getViewMessages(messages, activeView);
  const activeLabel = viewLabels[activeView];
  const composeOpen = composeParam === "new";

  const selectedMessage = messageIdParam
    ? visibleMessages.find((m) => m.id === messageIdParam) ??
      visibleMessages[0] ??
      null
    : visibleMessages[0] ?? null;
  const starredCount = messages.filter((msg) => msg.isStarred).length;
  const codeCount = messages.filter((msg) => msg.verificationCode).length;
  const unreadCount = messages.filter((msg) => !msg.isRead).length;
  const activeProviderLabel = selectedMessage
    ? getProviderLabel(selectedMessage.mailbox.provider)
    : "Glimmail";

  return (
    <main className="surface-grid min-h-screen bg-background text-[#f4f5e9]">
      <MobileTopBar />
      <AetherSidebar
        active={activeLabel}
        connectedAccountCount={mailboxes.length}
      />

      <section className="min-h-screen overflow-x-hidden pb-20 pt-16 md:ml-[106px] md:grid md:h-screen md:grid-cols-[minmax(360px,430px)_minmax(520px,1fr)] md:gap-[14px] md:overflow-hidden md:p-[14px_14px_14px_0] md:pb-[14px] md:pt-[14px] xl:grid-cols-[minmax(360px,430px)_minmax(520px,1fr)_330px]">
        <aside className="flex min-w-0 min-h-0 flex-col overflow-hidden border border-[#c4ffe2]/13 bg-[#0a1b18]/82 shadow-[0_28px_90px_rgba(0,0,0,0.42)] md:h-[calc(100vh-28px)] md:rounded-[26px]">
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
            <header className="relative border-b border-white/10 bg-[linear-gradient(180deg,rgba(10,27,24,0.96),rgba(10,27,24,0.84))] px-[22px] pb-3 pt-[22px] backdrop-blur-[18px] md:sticky md:top-0 md:z-10">
              <div className="pointer-events-none absolute right-5 top-5 size-[82px] rounded-full bg-[linear-gradient(135deg,transparent_0_44%,rgba(215,255,71,0.95)_45%_56%,transparent_57%),radial-gradient(circle_at_50%_50%,rgba(79,215,255,0.55),transparent_64%)] opacity-70" />
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#d7ff47]">
                Glimmail Unified Inbox
              </p>
              <h1 className="max-w-[280px] text-[42px] font-black leading-[0.96] tracking-[-0.08em] text-[#f4f5e9]">
                今日处理 <span className="text-[#d7ff47]">{messages.length}</span>
              </h1>
              <p className="mt-3 max-w-[270px] text-[13px] leading-[1.55] text-[#f4f5e9]/68">
                多个账号进入一个高能邮件流。按重要、验证码、通知和订阅分层处理。
              </p>

              <label className="relative mt-[18px] block">
                <span className="sr-only">搜索邮件</span>
                <input
                  className="w-full rounded-full border border-white/14 bg-white/[0.07] px-[18px] py-3.5 pr-[58px] text-sm text-[#f4f5e9] outline-none transition placeholder:text-[#f4f5e9]/42 focus:border-[#d7ff47]/55 focus:bg-white/10 focus:ring-4 focus:ring-[#d7ff47]/10"
                  placeholder="搜索邮件、验证码、联系人，或输入命令"
                  type="search"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full border border-white/14 px-2.5 py-1 text-[11px] font-black text-[#f4f5e9]/68">
                  Ctrl K
                </span>
              </label>

              <div className="mt-[18px] flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Link
                  className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 ${
                    activeView === "inbox"
                      ? "border-[#d7ff47]/50 bg-[#d7ff47]/12 text-[#d7ff47]"
                      : "border-white/12 bg-white/[0.05] text-[#f4f5e9]/68 hover:text-[#f4f5e9]"
                  }`}
                  href="/inbox"
                >
                  全部 {messages.length}
                </Link>
                <Link
                  className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 ${
                    activeView === "starred"
                      ? "border-[#d7ff47]/50 bg-[#d7ff47]/12 text-[#d7ff47]"
                      : "border-white/12 bg-white/[0.05] text-[#f4f5e9]/68 hover:text-[#f4f5e9]"
                  }`}
                  href="/inbox?view=starred"
                >
                  星标 {starredCount}
                </Link>
                <span className="shrink-0 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-black text-[#f4f5e9]/68">
                  验证码 {codeCount}
                </span>
                <span className="shrink-0 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-black text-[#f4f5e9]/68">
                  未读 {unreadCount}
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#d7ff47]/50 bg-[#d7ff47]/12 px-3 py-2 text-xs font-black text-[#d7ff47]">
                  <span className="size-2 rounded-full bg-[#87f2c5]" />
                  全部账号
                </span>
                {mailboxes.slice(0, 3).map((mailbox) => (
                  <span
                    className="inline-flex max-w-[180px] shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-black text-[#f4f5e9]/68"
                    key={mailbox.id}
                  >
                    <span
                      className={`size-2 rounded-full ${getProviderTone(
                        mailbox.provider,
                      )}`}
                    />
                    <span className="truncate">
                      {getProviderLabel(mailbox.provider)}
                    </span>
                  </span>
                ))}
              </div>
            </header>

            {composeOpen ? (
              <div className="m-3 rounded-[18px] border border-white/10 bg-white/[0.045] p-4 text-sm text-[#f4f5e9]/68">
                写邮件功能暂未接入。
              </div>
            ) : null}

            {visibleMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
                <SymbolIcon className="mb-4 text-[48px] text-[#f4f5e9]/36">
                  {activeView === "starred" ? "star_border" : "mail"}
                </SymbolIcon>
                <p className="text-lg font-black text-[#f4f5e9]/72">
                  暂无{activeLabel}邮件
                </p>
                <p className="mt-2 text-sm text-[#f4f5e9]/48">
                  {activeView === "inbox"
                    ? "连接邮箱并同步后，邮件会出现在这里。"
                    : "随着邮箱流程推进，这个分区会自动填充。"}
                </p>
              </div>
            ) : (
              <div className="border-t border-[#c4ffe2]/13 p-2.5">
                {visibleMessages.map((msg) => {
                  const isActive = selectedMessage?.id === msg.id;
                  const isUnread = !msg.isRead;
                  const hasVerification = !!msg.verificationCode;

                  return (
                    <Link
                      className={`group relative block cursor-pointer overflow-hidden rounded-[18px] border p-[15px_14px_14px] text-[#f4f5e9] transition before:absolute before:bottom-[13px] before:left-0 before:top-[13px] before:w-[3px] before:rounded-full before:opacity-80 hover:translate-x-[5px] hover:border-white/13 hover:bg-white/[0.06] ${getProviderItemClass(
                        msg.mailbox.provider,
                      )} ${
                        isActive
                          ? "border-[#d7ff47]/35 bg-[linear-gradient(135deg,rgba(215,255,71,0.1),rgba(79,215,255,0.05)),rgba(255,255,255,0.06)]"
                          : "border-transparent bg-transparent"
                      }`}
                      href={`/inbox?${
                        activeView === "inbox" ? "" : `view=${activeView}&`
                      }message=${encodeURIComponent(msg.id)}`}
                      key={msg.id}
                      scroll={false}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`truncate text-[13px] font-black ${
                            isUnread ? "text-[#f4f5e9]" : "text-[#f4f5e9]/72"
                          }`}
                        >
                          {msg.sender}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-[#f4f5e9]/48">
                          {formatMessageTime(msg.receivedAt)}
                        </span>
                      </div>
                      <h3
                        className={`mt-1 truncate text-[15px] leading-relaxed tracking-[-0.02em] ${
                          isUnread
                            ? "font-black text-[#f4f5e9]"
                            : "font-bold text-[#f4f5e9]/82"
                        }`}
                      >
                        {msg.subject}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#f4f5e9]/68">
                        {msg.preview ?? "(no preview)"}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap gap-1.5">
                          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-black tracking-[0.03em] text-[#f4f5e9]/68">
                            {getProviderLabel(msg.mailbox.provider)}
                          </span>
                          {hasVerification ? (
                            <span className="rounded-full border border-[#ff6b57]/35 bg-[#ff6b57]/10 px-2 py-1 text-[10px] font-black tracking-[0.03em] text-[#ffb0a4]">
                              验证码
                            </span>
                          ) : null}
                        </div>
                        <div className="hidden shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 md:flex">
                          <span className="grid size-7 place-items-center rounded-full border border-white/13 bg-white/[0.06] text-[10px] font-black text-[#f4f5e9]/68">
                            ST
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          </aside>

          {selectedMessage ? (
            <article className="hidden min-w-0 min-h-0 overflow-hidden bg-[#f7f1df] text-[#111e1a] shadow-[0_28px_80px_rgba(7,20,18,0.18)] md:flex md:h-[calc(100vh-28px)] md:flex-col md:rounded-[30px]">
              <header className="sticky top-0 z-10 flex min-h-[72px] items-center justify-between gap-4 border-b border-[#142a24]/14 bg-[#f7f1df]/88 px-[22px] py-4 backdrop-blur-[18px]">
                <div className="text-[13px] font-bold text-[#647069]">
                  {activeLabel} / {activeProviderLabel}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <form action={toggleStarredAction}>
                    <input
                      name="messageId"
                      type="hidden"
                      value={selectedMessage.id}
                    />
                    <input name="view" type="hidden" value={activeView} />
                    <button
                      className="min-w-[38px] rounded-full border border-[#111e1a]/12 bg-[#111e1a]/5 px-3 py-2 text-[10px] font-black text-[#30433d] transition hover:-translate-y-0.5 hover:border-[#0b6b66]/35 hover:bg-[#0b6b66]/10 hover:text-[#0b5551]"
                      title={selectedMessage.isStarred ? "取消星标" : "星标"}
                      type="submit"
                    >
                      ST
                    </button>
                  </form>
                  <form action={toggleReadAction}>
                    <input
                      name="messageId"
                      type="hidden"
                      value={selectedMessage.id}
                    />
                    <input name="view" type="hidden" value={activeView} />
                    <button
                      className="min-w-[38px] rounded-full border border-[#111e1a]/12 bg-[#111e1a]/5 px-3 py-2 text-[10px] font-black text-[#30433d] transition hover:-translate-y-0.5 hover:border-[#0b6b66]/35 hover:bg-[#0b6b66]/10 hover:text-[#0b5551]"
                      title={selectedMessage.isRead ? "标为未读" : "标为已读"}
                      type="submit"
                    >
                      {selectedMessage.isRead ? "标为未读" : "标为已读"}
                    </button>
                  </form>
                  <span className="min-w-[38px] rounded-full border border-[#111e1a]/12 bg-[#111e1a]/5 px-3 py-2 text-[10px] font-black text-[#30433d]">
                    归档
                  </span>
                  <span className="min-w-[38px] rounded-full border border-[#ff6b57]/25 bg-[#ff6b57]/10 px-3 py-2 text-[10px] font-black text-[#b33125]">
                    删除
                  </span>
                  <span className="min-w-[38px] rounded-full border border-[#111e1a]/12 bg-[#111e1a]/5 px-3 py-2 text-[10px] font-black text-[#30433d]">
                    MO
                  </span>
                </div>
              </header>

              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                <header className="relative border-b border-[#142a24]/14 px-[34px] py-8">
                  <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#0b6b66]">
                    邮件摘要 / 来源 {activeProviderLabel}
                  </p>
                  <h2 className="max-w-4xl break-words text-[clamp(2.1rem,4vw,4.9rem)] font-black leading-[0.92] tracking-[-0.08em]">
                    {selectedMessage.subject}
                  </h2>
                  <div className="mt-7 flex items-center gap-3">
                    <div className="grid size-12 shrink-0 place-items-center rounded-[18px] bg-[#071412] text-sm font-black text-[#d7ff47]">
                      {getInitials(selectedMessage.sender)}
                    </div>
                    <div>
                      <div className="text-sm font-black">
                        {selectedMessage.sender}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-[#647069]">
                        {selectedMessage.mailbox.address} ·{" "}
                        {selectedMessage.receivedAt.toLocaleDateString("zh-CN", {
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        {selectedMessage.receivedAt.toLocaleTimeString("zh-CN", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        · {activeProviderLabel}
                      </div>
                    </div>
                  </div>
                </header>

                <div className="px-[34px] py-7">
                  <section className="mb-5 flex items-start justify-between gap-4 rounded-[20px] border border-[#142a24]/12 bg-[#e5ddca]/68 p-5">
                    <div>
                      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#647069]">
                        邮件摘要
                      </div>
                      <div className="text-[15px] font-bold leading-7">
                        {selectedMessage.preview ??
                          "这封邮件暂无摘要，打开正文查看完整内容。"}
                      </div>
                    </div>
                    {selectedMessage.isStarred ? (
                      <span className="shrink-0 rounded-full border border-[#d7ff47]/35 bg-[#d7ff47]/14 px-2 py-1 text-[10px] font-black text-[#0b5551]">
                        重要
                      </span>
                    ) : null}
                  </section>

                  <section className="rounded-[24px] border border-[#142a24]/12 bg-[#fffaf0]/72 p-7 shadow-[0_18px_48px_rgba(17,30,26,0.08)]">
                    {selectedMessage.bodyText ? (
                      <div>
                        {selectedMessage.bodyText
                          .split("\n")
                          .filter(Boolean)
                          .map((paragraph, i) => (
                            <p
                              className={`text-base leading-8 text-[#111e1a] ${
                                i > 0 ? "mt-5" : ""
                              }`}
                              key={i}
                            >
                              {paragraph}
                            </p>
                          ))}
                      </div>
                    ) : (
                      <p className="text-base leading-8 text-[#647069]">
                        {selectedMessage.preview ?? "No content."}
                      </p>
                    )}

                    {selectedMessage.verificationCode ? (
                      <div className="mt-7 flex items-center justify-between gap-5 rounded-[20px] border border-[#142a24]/12 bg-[#071412] p-5 text-[#f4f5e9]">
                        <div>
                          <div className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#f4f5e9]/58">
                            识别到的验证码
                          </div>
                          <div className="font-mono text-[48px] font-black leading-none tracking-[0.18em] text-[#d7ff47]">
                            {selectedMessage.verificationCode}
                          </div>
                        </div>
                        <CopyCodeButton code={selectedMessage.verificationCode} />
                      </div>
                    ) : null}
                  </section>
                </div>
              </div>
            </article>
          ) : (
            <article className="hidden min-w-0 min-h-0 overflow-hidden bg-[#f7f1df] text-[#111e1a] shadow-[0_28px_80px_rgba(7,20,18,0.18)] md:flex md:h-[calc(100vh-28px)] md:items-center md:justify-center md:rounded-[30px]">
              <p className="text-lg font-bold text-[#647069]">
                选择一封邮件开始阅读
              </p>
            </article>
          )}

          <aside className="hidden min-w-0 min-h-0 flex-col gap-3 overflow-y-auto xl:flex xl:h-[calc(100vh-28px)]">
            <section className="rounded-[24px] border border-[#c4ffe2]/13 bg-[#d7ff47] p-5 text-[#071412] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black">当前邮件</h2>
                <span className="text-xs font-black text-[#071412]/68">
                  来源
                </span>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#071412]/62">来源账号</span>
                  <span className="font-black">{activeProviderLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#071412]/62">分类</span>
                  <span className="font-black">{activeLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#071412]/62">验证码</span>
                  <span className="font-black">
                    {selectedMessage?.verificationCode ? "已识别" : "无"}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-[#c4ffe2]/13 bg-[#0a1b18]/82 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-[#f4f5e9]">连接账号</h2>
                <Link
                  className="text-xs font-black text-[#d7ff47]"
                  href="/mailboxes"
                >
                  管理
                </Link>
              </div>
              <div className="grid gap-3">
                {mailboxes.length === 0 ? (
                  <p className="text-sm leading-6 text-[#f4f5e9]/58">
                    还没有连接账号。连接 Gmail、Outlook 或 163 邮箱后会显示同步状态。
                  </p>
                ) : (
                  mailboxes.slice(0, 4).map((mailbox) => (
                    <div className="flex min-w-0 items-center gap-3" key={mailbox.id}>
                      <div className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[#f7f1df] text-xs font-black text-[#071412]">
                        {getProviderLabel(mailbox.provider).slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-[#f4f5e9]">
                          {mailbox.address}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-[#f4f5e9]/58">
                          <span
                            className={`size-2 rounded-full ${getProviderTone(
                              mailbox.provider,
                            )}`}
                          />
                          已连接
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-[#c4ffe2]/13 bg-[#0a1b18]/82 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
              <h2 className="mb-4 text-lg font-black text-[#f4f5e9]">
                最近同步
              </h2>
              <div className="grid gap-3 text-sm leading-6 text-[#f4f5e9]/68">
                <p>
                  <strong className="text-[#f4f5e9]">邮件流</strong>
                  <br />
                  当前展示 {messages.length} 封邮件，{unreadCount} 封未读。
                </p>
                <p>
                  <strong className="text-[#f4f5e9]">账号</strong>
                  <br />
                  已连接 {mailboxes.length} 个账号。
                </p>
              </div>
            </section>
          </aside>
      </section>

      <button
        className="fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#d7ff47] text-[#071412] shadow-[0_18px_42px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 active:translate-y-0 md:hidden"
        type="button"
      >
        <SymbolIcon className="text-[24px]">edit</SymbolIcon>
      </button>
      <MobileBottomNav active={activeLabel} />
    </main>
  );
}
