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
import {
  syncGmailAction,
  syncMailboxAction,
  syncOutlookAction,
  testGmailConnectionAction,
  testMailboxConnectionAction,
  testOutlookConnectionAction,
} from "@/app/mailboxes/actions";

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

function formatClockTime(date: Date | null | undefined): string {
  if (!date) return "待同步";

  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

function getMailboxStatusLabel(status: string) {
  if (status === "error") return "需要处理";
  if (status === "disconnected") return "已断开";

  return "已授权同步";
}

function getMailboxSyncAction(provider: string) {
  if (provider === "gmail") return syncGmailAction;
  if (provider === "outlook") return syncOutlookAction;

  return syncMailboxAction;
}

function getMailboxTestAction(provider: string) {
  if (provider === "gmail") return testGmailConnectionAction;
  if (provider === "outlook") return testOutlookConnectionAction;

  return testMailboxConnectionAction;
}

function getMessageKind(message: {
  isRead: boolean;
  isStarred: boolean;
  preview: string | null;
  subject: string;
  verificationCode: string | null;
}) {
  const searchable = `${message.subject} ${message.preview ?? ""}`.toLowerCase();

  if (message.verificationCode) return "验证码";
  if (message.isStarred) return "安全通知";
  if (/subscribe|newsletter|digest|weekly|月报|周报|订阅|摘要/.test(searchable)) {
    return "订阅";
  }
  if (/sale|promo|offer|广告|推广|优惠|营销|垃圾|spam/.test(searchable)) {
    return "广告/垃圾";
  }
  if (/security|alert|notice|通知|提醒|安全|授权|登录|账号/.test(searchable)) {
    return "通知";
  }

  return message.isRead ? "邮件" : "未读";
}

function getKindBadgeClass(kind: string) {
  if (kind === "验证码") {
    return "border-[#ff6b57]/35 bg-[#ff6b57]/10 text-[#ffb0a4]";
  }
  if (kind === "安全通知" || kind === "重要") {
    return "border-[#d7ff47]/35 bg-[#d7ff47]/12 text-[#d7ff47]";
  }
  return "border-white/10 bg-white/[0.06] text-[#f4f5e9]/68";
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

const partitionLabels = {
  all: "全部",
  important: "重要",
  code: "验证码",
  notification: "通知",
  subscription: "订阅",
  unread: "未读",
  starred: "星标",
  junk: "广告/垃圾",
} as const;

type InboxPartition = keyof typeof partitionLabels;

function getInboxView(value?: string): InboxView {
  if (value && value in viewLabels) {
    return value as InboxView;
  }

  return "inbox";
}

function getInboxPartition(
  value: string | undefined,
  activeView: InboxView,
): InboxPartition {
  if (value && value in partitionLabels) {
    return value as InboxPartition;
  }

  return activeView === "starred" ? "starred" : "all";
}

function getViewMessages<T extends { isStarred: boolean }>(
  messages: T[],
  view: InboxView,
) {
  if (view === "starred") return messages.filter((msg) => msg.isStarred);
  if (view === "inbox") return messages;

  return [];
}

function getPartitionMessages<
  T extends {
    isRead: boolean;
    isStarred: boolean;
    preview: string | null;
    subject: string;
    verificationCode: string | null;
  },
>(messages: T[], partition: InboxPartition) {
  if (partition === "all") return messages;
  if (partition === "important" || partition === "starred") {
    return messages.filter((msg) => msg.isStarred);
  }
  if (partition === "code") return messages.filter((msg) => msg.verificationCode);
  if (partition === "unread") return messages.filter((msg) => !msg.isRead);

  return messages.filter((msg) => {
    const kind = getMessageKind(msg);

    if (partition === "notification") {
      return kind === "通知" || kind === "安全通知";
    }
    if (partition === "subscription") return kind === "订阅";
    if (partition === "junk") return kind === "广告/垃圾";

    return true;
  });
}

function createInboxHref({
  account,
  message,
  partition,
  view,
}: {
  account?: string;
  message?: string;
  partition?: InboxPartition;
  view?: InboxView;
}) {
  const params = new URLSearchParams();

  if (view && view !== "inbox") params.set("view", view);
  if (partition && partition !== "all") params.set("partition", partition);
  if (account && account !== "all") params.set("account", account);
  if (message) params.set("message", message);

  const query = params.toString();

  return query ? `/inbox?${query}` : "/inbox";
}

interface PageProps {
  searchParams: Promise<{
    account?: string;
    compose?: string;
    message?: string;
    partition?: string;
    view?: string;
  }>;
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
    account: accountParam,
    compose: composeParam,
    message: messageIdParam,
    partition: partitionParam,
    view: viewParam,
  } = await searchParams;
  const activeView = getInboxView(viewParam);
  const activePartition = getInboxPartition(partitionParam, activeView);
  const activeAccount = mailboxes.some((mailbox) => mailbox.id === accountParam)
    ? accountParam
    : "all";
  const viewMessages = getViewMessages(messages, activeView);
  const partitionedMessages = getPartitionMessages(
    viewMessages,
    activePartition,
  );
  const visibleMessages =
    activeAccount === "all"
      ? partitionedMessages
      : partitionedMessages.filter((msg) => msg.mailboxId === activeAccount);
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
  const notificationCount = messages.filter(
    (msg) => getMessageKind(msg) === "通知" || getMessageKind(msg) === "安全通知",
  ).length;
  const subscriptionCount = messages.filter(
    (msg) => getMessageKind(msg) === "订阅",
  ).length;
  const junkCount = messages.filter(
    (msg) => getMessageKind(msg) === "广告/垃圾",
  ).length;
  const partitionChips = [
    ["all", messages.length],
    ["important", starredCount],
    ["code", codeCount],
    ["notification", notificationCount],
    ["subscription", subscriptionCount],
    ["unread", unreadCount],
    ["starred", starredCount],
    ["junk", junkCount],
  ] as const;
  const activeProviderLabel = selectedMessage
    ? getProviderLabel(selectedMessage.mailbox.provider)
    : "Glimmail";
  const selectedMessageKind = selectedMessage
    ? getMessageKind(selectedMessage)
    : activeLabel;
  const selectedMailbox = selectedMessage
    ? mailboxes.find((mailbox) => mailbox.id === selectedMessage.mailboxId)
    : null;
  const selectedSenderCount = selectedMessage
    ? messages.filter((msg) => msg.sender === selectedMessage.sender).length
    : 0;
  const selectedMailboxMessageCount = selectedMailbox
    ? messages.filter((msg) => msg.mailboxId === selectedMailbox.id).length
    : messages.length;
  const syncAction = selectedMailbox
    ? getMailboxSyncAction(selectedMailbox.provider)
    : null;
  const testAction = selectedMailbox
    ? getMailboxTestAction(selectedMailbox.provider)
    : null;
  const sourceHref = selectedMailbox
    ? createInboxHref({
        account: selectedMailbox.id,
        partition: activePartition,
        view: activeView,
      })
    : "/mailboxes";

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
            <header className="relative border-b border-white/10 bg-[linear-gradient(180deg,rgba(10,27,24,0.96),rgba(10,27,24,0.84))] pb-0 pt-[22px] backdrop-blur-[18px] md:sticky md:top-0 md:z-10">
              <div className="relative px-[22px] pb-3">
                <div className="split-drift-mark pointer-events-none absolute right-5 top-5 size-[82px] rounded-full bg-[linear-gradient(135deg,transparent_0_44%,rgba(215,255,71,0.95)_45%_56%,transparent_57%),radial-gradient(circle_at_50%_50%,rgba(79,215,255,0.55),transparent_64%)] opacity-70" />
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#d7ff47]">
                  Glimmail Unified Inbox
                </p>
                <h1 className="max-w-[280px] text-[42px] font-black leading-[0.96] tracking-[-0.08em] text-[#f4f5e9]">
                  今日处理{" "}
                  <span className="text-[#d7ff47]">{messages.length}</span>
                </h1>
                <p className="mt-3 max-w-[270px] text-[13px] leading-[1.55] text-[#f4f5e9]/68">
                  多个账号进入一个高能邮件流。按重要、验证码、通知和订阅分层处理。
                </p>
              </div>

              <label className="relative mx-[22px] mt-[18px] block">
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

              <div
                aria-label="邮件分区"
                className="chip-scrollbar mt-[18px] flex gap-2 overflow-x-auto px-[22px] pb-3"
              >
                {partitionChips.map(([partition, count]) => {
                  const isActive = activePartition === partition;

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`relative shrink-0 rounded-full border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 ${
                        isActive
                          ? "border-[#d7ff47]/50 bg-[#d7ff47]/12 text-[#d7ff47] after:absolute after:inset-x-3 after:-bottom-1.5 after:h-0.5 after:rounded-full after:bg-[#d7ff47]"
                          : "border-white/12 bg-white/[0.05] text-[#f4f5e9]/68 hover:border-white/20 hover:bg-white/[0.08] hover:text-[#f4f5e9]"
                      }`}
                      href={createInboxHref({
                        account: activeAccount,
                        partition,
                        view: activeView,
                      })}
                      key={partition}
                    >
                      {partitionLabels[partition]} {count}
                    </Link>
                  );
                })}
              </div>

              <div
                aria-label="账号筛选"
                className="chip-scrollbar flex gap-2 overflow-x-auto px-[22px] pb-4 pt-1"
              >
                <Link
                  aria-current={activeAccount === "all" ? "page" : undefined}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 ${
                    activeAccount === "all"
                      ? "border-[#d7ff47]/50 bg-[#d7ff47]/12 text-[#d7ff47]"
                      : "border-white/12 bg-white/[0.05] text-[#f4f5e9]/68 hover:border-white/20 hover:bg-white/[0.08] hover:text-[#f4f5e9]"
                  }`}
                  href={createInboxHref({
                    account: "all",
                    partition: activePartition,
                    view: activeView,
                  })}
                >
                  <span className="size-2 rounded-full bg-[#87f2c5]" />
                  全部账号
                </Link>
                {mailboxes.map((mailbox) => {
                  const isActive = activeAccount === mailbox.id;
                  const mailboxCount = partitionedMessages.filter(
                    (msg) => msg.mailboxId === mailbox.id,
                  ).length;

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`inline-flex max-w-[180px] shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 ${
                        isActive
                          ? "border-[#d7ff47]/50 bg-[#d7ff47]/12 text-[#d7ff47]"
                          : "border-white/12 bg-white/[0.05] text-[#f4f5e9]/68 hover:border-white/20 hover:bg-white/[0.08] hover:text-[#f4f5e9]"
                      }`}
                      href={createInboxHref({
                        account: mailbox.id,
                        partition: activePartition,
                        view: activeView,
                      })}
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
                      <span className="font-mono text-[10px] opacity-60">
                        {mailboxCount}
                      </span>
                    </Link>
                  );
                })}
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
                  const messageKind = getMessageKind(msg);

                  return (
                    <Link
                      className={`group relative block cursor-pointer overflow-hidden rounded-[18px] border p-[15px_14px_14px] text-[#f4f5e9] transition before:absolute before:bottom-[13px] before:left-0 before:top-[13px] before:w-[3px] before:rounded-full before:opacity-80 hover:translate-x-[5px] hover:border-white/13 hover:bg-white/[0.06] ${getProviderItemClass(
                        msg.mailbox.provider,
                      )} ${
                        isActive
                          ? "border-[#d7ff47]/35 bg-[linear-gradient(135deg,rgba(215,255,71,0.1),rgba(79,215,255,0.05)),rgba(255,255,255,0.06)]"
                          : "border-transparent bg-transparent"
                      }`}
                      href={createInboxHref({
                        account: activeAccount,
                        message: msg.id,
                        partition: activePartition,
                        view: activeView,
                      })}
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
                          <span
                            className={`rounded-full border px-2 py-1 text-[10px] font-black tracking-[0.03em] ${getKindBadgeClass(
                              messageKind,
                            )}`}
                          >
                            {messageKind}
                          </span>
                          {isUnread ? (
                            <span className="rounded-full border border-[#4fd7ff]/35 bg-[#4fd7ff]/10 px-2 py-1 text-[10px] font-black tracking-[0.03em] text-[#9be9ff]">
                              未读
                            </span>
                          ) : null}
                        </div>
                        <div
                          aria-label="邮件快捷操作"
                          className={`hidden shrink-0 translate-x-2 gap-[5px] opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 md:flex ${
                            isActive ? "translate-x-0 opacity-100" : ""
                          }`}
                        >
                          <span className="grid size-7 place-items-center rounded-full border border-white/13 bg-white/[0.06] text-[10px] font-black text-[#f4f5e9]/68 transition hover:-translate-y-0.5 hover:border-[#d7ff47]/35 hover:bg-[#d7ff47]/12 hover:text-[#d7ff47]">
                            ST
                          </span>
                          <span className="grid size-7 place-items-center rounded-full border border-white/13 bg-white/[0.06] text-[10px] font-black text-[#f4f5e9]/68 transition hover:-translate-y-0.5 hover:border-[#d7ff47]/35 hover:bg-[#d7ff47]/12 hover:text-[#d7ff47]">
                            AR
                          </span>
                          <span className="grid size-7 place-items-center rounded-full border border-white/13 bg-white/[0.06] text-[10px] font-black text-[#f4f5e9]/68 transition hover:-translate-y-0.5 hover:border-[#ff6b57]/40 hover:bg-[#ff6b57]/12 hover:text-[#ffb0a4]">
                            DE
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
            <article className="relative hidden min-w-0 min-h-0 overflow-hidden bg-[#f7f1df] text-[#111e1a] shadow-[0_28px_80px_rgba(7,20,18,0.18)] md:flex md:h-[calc(100vh-28px)] md:flex-col md:rounded-[30px]">
              <div className="reader-drift-mark reader-drift-mark-primary" />
              <div className="reader-drift-mark reader-drift-mark-secondary" />
              <header className="sticky top-0 z-10 flex min-h-[72px] items-center justify-between gap-4 border-b border-[#142a24]/14 bg-[#f7f1df]/88 px-[22px] py-4 backdrop-blur-[18px]">
                <div className="text-[13px] font-bold text-[#647069]">
                  {activeLabel} / {activeProviderLabel} / {selectedMessageKind}
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
                      className="min-w-[38px] rounded-full border border-[#111e1a]/12 bg-[#111e1a]/5 cursor-pointer px-3 py-2 text-[10px] font-black text-[#30433d] transition hover:-translate-y-0.5 hover:border-[#0b6b66]/35 hover:bg-[#0b6b66]/10 hover:text-[#0b5551]"
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
                      className="min-w-[38px] rounded-full border border-[#111e1a]/12 bg-[#111e1a]/5 cursor-pointer px-3 py-2 text-[10px] font-black text-[#30433d] transition hover:-translate-y-0.5 hover:border-[#0b6b66]/35 hover:bg-[#0b6b66]/10 hover:text-[#0b5551]"
                      title={selectedMessage.isRead ? "标为未读" : "标为已读"}
                      type="submit"
                    >
                      {selectedMessage.isRead ? "标为未读" : "标为已读"}
                    </button>
                  </form>
                  <button
                    className="min-w-[38px] rounded-full border border-[#111e1a]/12 bg-[#111e1a]/5 cursor-pointer px-3 py-2 text-[10px] font-black text-[#30433d] transition hover:-translate-y-0.5 hover:border-[#0b6b66]/35 hover:bg-[#0b6b66]/10 hover:text-[#0b5551]"
                    title="归档"
                    type="button"
                  >
                    归档
                  </button>
                  <button
                    className="min-w-[38px] rounded-full border border-[#ff6b57]/25 bg-[#ff6b57]/10 cursor-pointer px-3 py-2 text-[10px] font-black text-[#b33125] transition hover:-translate-y-0.5 hover:border-[#ff6b57]/50 hover:bg-[#ff6b57]/14"
                    title="删除"
                    type="button"
                  >
                    删除
                  </button>
                  <button
                    className="min-w-[38px] rounded-full border border-[#111e1a]/12 bg-[#111e1a]/5 cursor-pointer px-3 py-2 text-[10px] font-black text-[#30433d] transition hover:-translate-y-0.5 hover:border-[#0b6b66]/35 hover:bg-[#0b6b66]/10 hover:text-[#0b5551]"
                    title="更多"
                    type="button"
                  >
                    MO
                  </button>
                </div>
              </header>

              <div className="custom-scrollbar relative z-[1] min-h-0 flex-1 overflow-y-auto">
                <header className="relative overflow-hidden border-b border-[#142a24]/14 px-[34px] pb-7 pt-8">
                  <p className="relative z-[1] mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#0b6b66]">
                    邮件摘要 / 来源 {activeProviderLabel}
                  </p>
                  <h2 className="relative z-[1] max-w-4xl break-words text-[clamp(2.1rem,4vw,4.9rem)] font-black leading-[0.92] tracking-[-0.08em]">
                    {selectedMessage.subject}
                  </h2>
                  <div className="relative z-[1] mt-7 flex items-center gap-3">
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
                  <section className="mb-[18px] grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-[18px] rounded-[18px] border border-[#142a24]/12 bg-[linear-gradient(135deg,rgba(215,255,71,0.38),rgba(79,215,255,0.16)),rgba(255,255,255,0.36)] p-[18px]">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.12em] text-[#0b6b66]">
                        邮件摘要
                      </div>
                      <div className="mt-[7px] text-sm leading-[1.55] text-[#20352f]">
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

                  <section className="w-full rounded-[22px] border border-[#142a24]/12 bg-[#fff8e8] p-[30px] shadow-[0_22px_60px_rgba(17,30,26,0.08)]">
                    {selectedMessage.bodyText ? (
                      <div>
                        {selectedMessage.bodyText
                          .split("\n")
                          .filter(Boolean)
                          .map((paragraph, i) => (
                            <p
                              className={`text-base leading-[1.9] text-[#26352f] ${
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
                      <div className="mt-[26px] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-[18px] rounded-[18px] bg-[#101d19] p-5 text-[#f4f5e9]">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[0.08em] text-[#f4f5e9]/64">
                            识别到的验证码
                          </div>
                          <div className="mt-1.5 font-mono text-[38px] font-black leading-none tracking-[0.16em] text-[#d7ff47] drop-shadow-[0_0_22px_rgba(215,255,71,0.22)]">
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

          <aside className="custom-scrollbar hidden min-w-0 min-h-0 flex-col gap-[14px] overflow-y-auto xl:flex xl:h-[calc(100vh-28px)]">
            <section className="rounded-[24px] border border-[#c4ffe2]/13 bg-[linear-gradient(135deg,rgba(79,215,255,0.12),rgba(215,255,71,0.08)),rgba(10,27,24,0.78)] p-[17px] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
              <div className="mb-[14px] flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-black leading-none tracking-[-0.03em] text-[#f4f5e9]">
                  当前邮件
                </h2>
                <Link
                  className="text-xs font-black text-[#d7ff47] transition hover:text-[#ecff8a]"
                  href={sourceHref}
                >
                  查看来源
                </Link>
              </div>
              <div className="grid text-sm">
                {[
                  ["来源账号", activeProviderLabel],
                  ["同步时间", formatClockTime(selectedMailbox?.lastSyncedAt)],
                  ["分类", selectedMessageKind],
                  ["发件人历史", `${selectedSenderCount} 封`],
                ].map(([label, value], index) => (
                  <div
                    className={`grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 py-[9px] ${
                      index > 0 ? "border-t border-[#c4ffe2]/13" : ""
                    }`}
                    key={label}
                  >
                    <span className="text-xs text-[#f4f5e9]/58">{label}</span>
                    <span className="max-w-[168px] truncate text-right text-[13px] font-black text-[#f4f5e9]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-[#c4ffe2]/13 bg-[#0a1b18]/78 p-[17px] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
              <div className="mb-[14px] flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-black leading-none tracking-[-0.03em] text-[#f4f5e9]">
                  连接账号
                </h2>
                <Link
                  className="text-xs font-black text-[#d7ff47] transition hover:text-[#ecff8a]"
                  href="/mailboxes"
                >
                  管理
                </Link>
              </div>
              <div className="grid">
                {mailboxes.length === 0 ? (
                  <p className="rounded-[16px] border border-white/[0.08] bg-white/[0.045] p-[11px] text-xs leading-[1.55] text-[#f4f5e9]/58">
                    还没有连接账号。连接 Gmail、Outlook 或 163 邮箱后会显示同步状态。
                  </p>
                ) : (
                  mailboxes.slice(0, 4).map((mailbox, index) => (
                    <Link
                      className={`grid min-w-0 grid-cols-[38px_minmax(0,1fr)] gap-2.5 py-2.5 transition hover:translate-x-0.5 ${
                        index > 0 ? "border-t border-[#c4ffe2]/13" : ""
                      }`}
                      href={createInboxHref({
                        account: mailbox.id,
                        partition: activePartition,
                        view: activeView,
                      })}
                      key={mailbox.id}
                    >
                      <div className="grid size-[38px] shrink-0 place-items-center rounded-[13px] bg-white/[0.07] text-[11px] font-black text-[#d7ff47]">
                        {getProviderLabel(mailbox.provider).slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-black text-[#f4f5e9]">
                          {mailbox.address}
                        </div>
                        <div className="mt-1 flex items-center gap-[7px] text-xs text-[#f4f5e9]/58">
                          <span
                            className={`size-2 animate-pulse rounded-full ${getProviderTone(
                              mailbox.provider,
                            )}`}
                          />
                          {getMailboxStatusLabel(mailbox.status)}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <div className="mt-[14px] grid grid-cols-2 gap-2">
                {syncAction && selectedMailbox ? (
                  <form action={syncAction}>
                    <input
                      name="mailboxId"
                      type="hidden"
                      value={selectedMailbox.id}
                    />
                    <button
                      className="min-h-10 w-full rounded-full border border-[#d7ff47] bg-[#d7ff47] px-4 text-xs font-black text-[#071412] transition hover:-translate-y-px hover:bg-[#ecff8a] focus:outline-none focus:ring-2 focus:ring-[#d7ff47]/35"
                      type="submit"
                    >
                      立即同步
                    </button>
                  </form>
                ) : (
                  <Link
                    className="grid min-h-10 place-items-center rounded-full border border-[#d7ff47] bg-[#d7ff47] px-4 text-xs font-black text-[#071412] transition hover:-translate-y-px hover:bg-[#ecff8a]"
                    href="/mailboxes"
                  >
                    连接邮箱
                  </Link>
                )}
                {testAction && selectedMailbox ? (
                  <form action={testAction}>
                    <input
                      name="mailboxId"
                      type="hidden"
                      value={selectedMailbox.id}
                    />
                    <button
                      className="min-h-10 w-full rounded-full border border-white/14 bg-white/[0.06] px-4 text-xs font-black text-[#f4f5e9] transition hover:-translate-y-px hover:border-[#d7ff47]/35 hover:text-[#d7ff47] focus:outline-none focus:ring-2 focus:ring-[#d7ff47]/25"
                      type="submit"
                    >
                      测试连接
                    </button>
                  </form>
                ) : (
                  <Link
                    className="grid min-h-10 place-items-center rounded-full border border-white/14 bg-white/[0.06] px-4 text-xs font-black text-[#f4f5e9] transition hover:-translate-y-px hover:border-[#d7ff47]/35 hover:text-[#d7ff47]"
                    href="/mailboxes"
                  >
                    测试连接
                  </Link>
                )}
                <Link
                  className="col-span-2 grid min-h-10 place-items-center rounded-full border border-white/14 bg-white/[0.06] px-4 text-xs font-black text-[#f4f5e9] transition hover:-translate-y-px hover:border-[#d7ff47]/35 hover:text-[#d7ff47]"
                  href={
                    selectedMailbox
                      ? `/mailboxes/connect?provider=${selectedMailbox.provider}`
                      : "/mailboxes"
                  }
                >
                  重新授权
                </Link>
              </div>
            </section>

            <section className="rounded-[24px] border border-[#c4ffe2]/13 bg-[#0a1b18]/78 p-[17px] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
              <div className="mb-[14px] flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-black leading-none tracking-[-0.03em] text-[#f4f5e9]">
                  最近同步
                </h2>
              </div>
              <div className="grid gap-2">
                {mailboxes.length > 0 ? (
                  mailboxes.slice(0, 3).map((mailbox) => {
                    const mailboxMessageCount = messages.filter(
                      (msg) => msg.mailboxId === mailbox.id,
                    ).length;

                    return (
                      <div
                        className="rounded-[16px] border border-white/[0.08] bg-white/[0.045] p-[11px] text-xs leading-[1.48] text-[#f4f5e9]/58"
                        key={mailbox.id}
                      >
                        <strong className="text-[#f4f5e9]">
                          {getProviderLabel(mailbox.provider)}
                        </strong>
                        <br />
                        {formatClockTime(mailbox.lastSyncedAt)}，当前保留{" "}
                        {mailboxMessageCount} 封邮件。
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.045] p-[11px] text-xs leading-[1.48] text-[#f4f5e9]/58">
                    <strong className="text-[#f4f5e9]">邮件流</strong>
                    <br />
                    连接账号后会在这里显示同步结果。
                  </div>
                )}
                <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.045] p-[11px] text-xs leading-[1.48] text-[#f4f5e9]/58">
                  <strong className="text-[#f4f5e9]">统一收件箱</strong>
                  <br />
                  当前展示 {selectedMailboxMessageCount} 封邮件，{unreadCount}{" "}
                  封未读。
                </div>
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
