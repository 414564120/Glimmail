import Link from "next/link";
import { redirect } from "next/navigation";
import type { Mailbox, MailboxProvider, SyncLog } from "@prisma/client";
import {
  AetherSidebar,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/shell/aether-sidebar";
import { SymbolIcon } from "@/components/shell/aether-icons";
import { getCurrentUser } from "@/modules/auth";
import { getRecentSyncLogs, getUserMailboxes } from "@/modules/mailboxes";
import { getMailboxCredential } from "@/modules/mailboxes/credentials";
import { hasGmailReadonlyScope } from "@/modules/providers/gmail";
import { hasMailReadScope } from "@/modules/providers/outlook";
import { RemoveMailboxForm } from "@/components/mailboxes/remove-mailbox-form";
import { SyncNowButton } from "@/components/mailboxes/sync-now-button";
import { TestConnectionButton } from "@/components/mailboxes/test-connection-button";

const PROVIDER_META: Record<
  MailboxProvider,
  {
    action: string;
    accent: string;
    connectHref: string;
    description: string;
    label: string;
    logoClass: string;
    short: string;
  }
> = {
  gmail: {
    action: "连接 Gmail",
    accent: "bg-[#87f2c5]",
    connectHref: "/api/auth/gmail/start?scope=gmail",
    description: "读取 Google 邮箱并同步到统一收件箱。",
    label: "Gmail",
    logoClass: "gmail-mark",
    short: "Gm",
  },
  outlook: {
    action: "连接 Outlook",
    accent: "bg-[#4fd7ff]",
    connectHref: "/api/auth/outlook/start?scope=mail",
    description: "连接 Microsoft、Exchange 或 Office 365 邮箱。",
    label: "Outlook",
    logoClass: "outlook-mark",
    short: "Ou",
  },
  mail163: {
    action: "连接 163 邮箱",
    accent: "bg-[#ff6b57]",
    connectHref: "/mailboxes/connect?provider=mail163",
    description: "使用 163 客户端授权码同步区域邮箱。",
    label: "163 邮箱",
    logoClass: "netease-mark",
    short: "16",
  },
};

const PROVIDER_ORDER: MailboxProvider[] = ["outlook", "gmail", "mail163"];
const RECENT_ACTIVITY_PROVIDERS = new Set<MailboxProvider>([
  "gmail",
  "outlook",
  "mail163",
]);

type MailboxWithActivity = Mailbox & {
  authorized: boolean;
  recentLogs: SyncLog[];
};

function supportsRecentActivity(provider: MailboxProvider): boolean {
  return RECENT_ACTIVITY_PROVIDERS.has(provider);
}

function normalizeBannerMessage(message: string | undefined): string | null {
  const normalized = message?.trim();
  return normalized || null;
}

function formatActivityTime(date: Date): string {
  return date.toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

function formatActivityMessage(message: string | null): string {
  return message?.trim() || "同步记录已更新";
}

function getStatusLabel(status: string): string {
  if (status === "error") return "需要处理";
  if (status === "disconnected") return "已断开";
  return "已连接";
}

function getStatusTone(status: string): string {
  if (status === "error") return "text-[#ff8b78]";
  if (status === "disconnected") return "text-[#f4f5e9]/[.46]";
  return "text-[#d7ff47]";
}

function getLatestSyncAt(mailboxes: Mailbox[]) {
  return mailboxes
    .map((mailbox) => mailbox.lastSyncedAt)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];
}

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

function getProviderMeta(provider: MailboxProvider) {
  return PROVIDER_META[provider];
}

function getSyncAuthorizationCopy(mailbox: MailboxWithActivity) {
  if (mailbox.authorized) return "同步权限完整";
  if (mailbox.provider === "gmail") return "Gmail 读取权限未完成";
  if (mailbox.provider === "outlook") return "Outlook 邮件权限未完成";
  return "IMAP 授权可用";
}

interface PageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function MailboxesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/mailboxes");
  }

  const mailboxes = await getUserMailboxes(user.id);
  const { error, success } = await searchParams;
  const errorMessage = normalizeBannerMessage(error);
  const successMessage = normalizeBannerMessage(success);

  const mailboxesWithActivity: MailboxWithActivity[] = await Promise.all(
    mailboxes.map(async (mailbox) => {
      const recentLogs = supportsRecentActivity(mailbox.provider)
        ? await getRecentSyncLogs(user.id, mailbox.id, 3)
        : [];
      let authorized = true;

      if (mailbox.provider === "gmail") {
        const scope = await getMailboxCredential(
          user.id,
          mailbox.id,
          "oauth_granted_scope",
        );
        authorized = scope ? hasGmailReadonlyScope(scope) : false;
      }

      if (mailbox.provider === "outlook") {
        const scope = await getMailboxCredential(
          user.id,
          mailbox.id,
          "oauth_granted_scope",
        );
        authorized = scope ? hasMailReadScope(scope) : false;
      }

      return { ...mailbox, authorized, recentLogs };
    }),
  );

  const connectedCount = mailboxesWithActivity.length;
  const healthyCount = mailboxesWithActivity.filter(
    (mailbox) => mailbox.status === "active" && mailbox.authorized,
  ).length;
  const attentionCount = mailboxesWithActivity.filter(
    (mailbox) => mailbox.status !== "active" || !mailbox.authorized,
  ).length;
  const latestSyncAt = getLatestSyncAt(mailboxesWithActivity);
  const connectedProviders = new Set(
    mailboxesWithActivity.map((mailbox) => mailbox.provider),
  );

  return (
    <main className="surface-grid min-h-screen bg-background text-[#f4f5e9]">
      <MobileTopBar />
      <AetherSidebar
        active="Accounts"
        connectedAccountCount={connectedCount}
      />

      <section className="min-h-screen overflow-x-hidden px-4 pb-28 pt-20 md:ml-[120px] md:p-[14px_14px_14px_0] md:pt-[14px]">
        <div className="grid min-h-[calc(100vh-28px)] min-w-0 gap-[14px] xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)_minmax(260px,300px)] 2xl:grid-cols-[minmax(360px,430px)_minmax(560px,1fr)_330px]">
          <aside className="preview-glass-border preview-surface-82 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[26px] border shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
            <div className="preview-split-header-bg relative overflow-hidden border-b border-white/10 px-[22px] pb-7 pt-[22px]">
              <div className="split-drift-mark preview-split-mark-bg pointer-events-none absolute right-5 top-6 size-[82px] rounded-full opacity-70" />
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#d7ff47]">
                Glimmail Account Hub
              </p>
              <h1 className="max-w-[300px] text-[42px] font-black leading-[0.96] tracking-[-0.08em] text-[#f4f5e9]">
                账号控制台
                <span className="block text-[#d7ff47]">{connectedCount}</span>
              </h1>
              <p className="mt-3 max-w-[286px] text-[13px] leading-[1.55] text-[#f4f5e9]/[.68]">
                连接邮箱、刷新授权、测试同步。这里是 Glimmail 的账号接入面板。
              </p>
            </div>

            <div className="grid gap-2.5 p-2.5">
              {[
                ["连接账号", `${connectedCount} 个`, "mail"],
                ["正常可用", `${healthyCount} 个`, "sync"],
                ["需要处理", `${attentionCount} 个`, "warning"],
              ].map(([label, value, icon]) => (
                <div
                  className="rounded-[18px] border border-white/[0.08] bg-white/[0.045] p-[15px] text-[#f4f5e9]"
                  key={label}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#f4f5e9]/[.48]">
                        {label}
                      </p>
                      <p className="mt-2 text-[26px] font-black leading-none tracking-[-0.05em]">
                        {value}
                      </p>
                    </div>
                    <SymbolIcon className="text-[24px] text-[#d7ff47]">
                      {icon}
                    </SymbolIcon>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto border-t border-white/[0.08] p-2.5">
              <p className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-[15px] text-xs leading-5 text-[#f4f5e9]/[.58]">
                添加新账号请使用中间的邮箱连接区域或右侧快速连接。
              </p>
            </div>
          </aside>

          <article className="relative min-h-0 min-w-0 overflow-hidden rounded-[30px] bg-[#f7f1df] text-[#111e1a] shadow-[0_28px_80px_rgba(7,20,18,0.18)]">
            <div className="reader-drift-mark reader-drift-mark-primary" />
            <div className="reader-drift-mark reader-drift-mark-secondary" />
            <header className="relative z-[1] border-b border-[#142a24]/[.14] px-[34px] pb-8 pt-8">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#142a24]/[.12] bg-[#111e1a]/[.05] px-3 py-1 text-[11px] font-black text-[#30433d]">
                  当前登录
                </span>
                <span className="rounded-full border border-[#142a24]/[.12] bg-[#111e1a]/[.05] px-3 py-1 text-[11px] font-black text-[#30433d]">
                  {user.role}
                </span>
                {successMessage ? (
                  <span className="rounded-full border border-[#0b6b66]/25 bg-[#87f2c5]/35 px-3 py-1 text-[11px] font-black text-[#0b6b66]">
                    {successMessage}
                  </span>
                ) : null}
                {errorMessage ? (
                  <span className="rounded-full border border-[#ff6b57]/25 bg-[#ff6b57]/15 px-3 py-1 text-[11px] font-black text-[#a83a2c]">
                    {errorMessage}
                  </span>
                ) : null}
              </div>
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#0b6b66]">
                邮箱账号 / 授权管理
              </p>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <h2 className="max-w-[720px] break-all text-[42px] font-black leading-[0.98] tracking-[-0.06em] lg:text-[54px]">
                    {user.email}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-[#647069]">
                    已连接邮箱会进入统一收件箱；缺少读取权限的账号需要重新授权后才能同步。
                  </p>
                </div>
                <div className="grid size-[78px] place-items-center rounded-[24px] bg-[#071412] text-[18px] font-black text-[#d7ff47] shadow-[0_18px_42px_rgba(7,20,18,0.18)]">
                  {getInitials(user.email)}
                </div>
              </div>
            </header>

            <div className="relative z-[1] grid gap-[18px] px-[34px] py-7">
              <section className="mail-summary-strip grid gap-4 rounded-[18px] border p-[18px] md:grid-cols-3">
                <div>
                  <p className="text-[12px] font-[950] uppercase tracking-[0.12em] text-[#0b6b66]">
                    已连接
                  </p>
                  <p className="mt-2 text-base font-black">
                    {connectedCount} 个账号
                  </p>
                </div>
                <div>
                  <p className="text-[12px] font-[950] uppercase tracking-[0.12em] text-[#0b6b66]">
                    需要处理
                  </p>
                  <p className="mt-2 text-base font-black">
                    {attentionCount} 个状态
                  </p>
                </div>
                <div>
                  <p className="text-[12px] font-[950] uppercase tracking-[0.12em] text-[#0b6b66]">
                    最近同步
                  </p>
                  <p className="mt-2 text-base font-black">
                    {latestSyncAt ? formatActivityTime(latestSyncAt) : "暂无记录"}
                  </p>
                </div>
              </section>

              <section className="rounded-[22px] border border-[#142a24]/[.12] bg-[#fff8e8] p-[24px] shadow-[0_22px_60px_rgba(17,30,26,0.08)]">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-[950] uppercase tracking-[0.12em] text-[#0b6b66]">
                      Connected Providers
                    </p>
                    <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">
                      邮箱连接
                    </h3>
                  </div>
                  <Link
                    className="rounded-full border border-[#111e1a]/[.12] bg-[#111e1a]/[.05] px-4 py-2 text-xs font-black text-[#30433d] transition hover:-translate-y-0.5 hover:border-[#0b6b66]/35 hover:bg-[#0b6b66]/10 hover:text-[#0b5551]"
                    href="/mailboxes/connect?provider=mail163"
                  >
                    添加邮箱
                  </Link>
                </div>

                <div className="grid gap-3">
                  {PROVIDER_ORDER.map((provider) => {
                    const mailbox = mailboxesWithActivity.find(
                      (item) => item.provider === provider,
                    );
                    const meta = getProviderMeta(provider);

                    return mailbox ? (
                      <ConnectedMailboxCard
                        key={provider}
                        mailbox={mailbox}
                        meta={meta}
                      />
                    ) : (
                      <Link
                        className="grid gap-4 rounded-[20px] border border-[#142a24]/[.12] bg-white/[.42] p-4 transition hover:-translate-y-0.5 hover:border-[#0b6b66]/35 hover:bg-white/[.62] md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
                        href={meta.connectHref}
                        key={provider}
                      >
                        <span className="grid size-12 place-items-center rounded-[17px] bg-[#071412] shadow-[0_18px_38px_rgba(7,20,18,0.14)]">
                          <span className={`provider-logo ${meta.logoClass}`} />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className={`size-2.5 rounded-full ${meta.accent}`} />
                            <span className="text-base font-black">
                              {meta.label}
                            </span>
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-[#647069]">
                            {meta.description}
                          </span>
                        </span>
                        <span className="rounded-full border border-[#142a24]/[.14] bg-[#071412] px-4 py-2 text-center text-xs font-black text-[#f4f5e9]">
                          {meta.action}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </div>
          </article>

          <aside className="hidden min-h-0 min-w-0 flex-col gap-[14px] xl:flex">
            <section className="context-panel-featured rounded-[24px] border p-[17px] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
              <div className="mb-[14px] flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-black leading-none tracking-[-0.03em] text-[#f4f5e9]">
                  接入概览
                </h2>
                <span className="text-xs font-[850] text-[#c4ffe2]/[.72]">
                  {connectedCount}/3
                </span>
              </div>
              <div className="grid gap-3">
                {PROVIDER_ORDER.map((provider) => {
                  const meta = getProviderMeta(provider);
                  const connected = connectedProviders.has(provider);

                  return (
                    <Link
                      className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] border border-white/[0.08] bg-white/[0.045] p-[11px] transition hover:-translate-y-px hover:border-[#d7ff47]/30"
                      href={connected ? "/mailboxes" : meta.connectHref}
                      key={provider}
                    >
                      <span className="grid size-9 place-items-center rounded-[13px] bg-[#f7f1df] text-[11px] font-black text-[#071412]">
                        {meta.short}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-black text-[#f4f5e9]">
                          {meta.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-[#f4f5e9]/[.58]">
                          {connected ? "已接入" : "未连接"}
                        </span>
                      </span>
                      <span className={`size-2.5 rounded-full ${connected ? meta.accent : "bg-white/[.18]"}`} />
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="context-panel rounded-[24px] border p-[17px] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
              <h2 className="mb-[14px] text-[15px] font-black leading-none tracking-[-0.03em] text-[#f4f5e9]">
                快速连接
              </h2>
              <div className="grid gap-2">
                {PROVIDER_ORDER.map((provider) => {
                  const meta = getProviderMeta(provider);
                  const connected = connectedProviders.has(provider);

                  return (
                    <Link
                      className={`grid min-h-10 place-items-center rounded-full border px-4 text-xs font-black transition hover:-translate-y-px ${
                        connected
                          ? "border-white/[.14] bg-white/[0.06] text-[#f4f5e9]/[.56]"
                          : "border-[#d7ff47] bg-[#d7ff47] text-[#071412] hover:bg-[#ecff8a]"
                      }`}
                      href={connected ? "/mailboxes" : meta.connectHref}
                      key={provider}
                    >
                      {connected ? `${meta.label} 已连接` : meta.action}
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="context-panel rounded-[24px] border p-[17px] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
              <h2 className="text-[15px] font-black leading-none tracking-[-0.03em] text-[#f4f5e9]">
                最近同步
              </h2>
              <div className="mt-4 grid gap-3">
                {mailboxesWithActivity.flatMap((mailbox) =>
                  mailbox.recentLogs.slice(0, 1).map((log) => (
                    <div
                      className="rounded-[16px] border border-white/[0.08] bg-white/[0.045] p-[11px]"
                      key={log.id}
                    >
                      <p className="truncate text-[13px] font-black text-[#f4f5e9]">
                        {getProviderMeta(mailbox.provider).label}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#f4f5e9]/[.58]">
                        {formatActivityMessage(log.message)}
                      </p>
                    </div>
                  )),
                )}
                {mailboxesWithActivity.every(
                  (mailbox) => mailbox.recentLogs.length === 0,
                ) ? (
                  <p className="rounded-[16px] border border-white/[0.08] bg-white/[0.045] p-[11px] text-xs leading-5 text-[#f4f5e9]/[.58]">
                    还没有同步记录。连接并同步后，这里会显示最新状态。
                  </p>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </section>

      <MobileBottomNav
        active="Accounts"
        items={[
          ["mail", "收件箱"],
          ["hub", "账号"],
          ["search", "搜索"],
          ["settings", "设置"],
        ]}
      />
    </main>
  );
}

function ConnectedMailboxCard({
  mailbox,
  meta,
}: {
  mailbox: MailboxWithActivity;
  meta: (typeof PROVIDER_META)[MailboxProvider];
}) {
  const latestLog = mailbox.recentLogs[0];

  return (
    <article className="rounded-[20px] border border-[#142a24]/[.12] bg-white/[.42] p-4">
      <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start">
        <div className="grid size-12 place-items-center rounded-[17px] bg-[#071412] shadow-[0_18px_38px_rgba(7,20,18,0.14)]">
          <span className={`provider-logo ${meta.logoClass}`} />
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className={`size-2.5 rounded-full ${meta.accent}`} />
            <h4 className="min-w-0 max-w-full truncate text-base font-black">
              {mailbox.address}
            </h4>
            <span
              className={`shrink-0 text-xs font-black ${getStatusTone(mailbox.status)}`}
            >
              {getStatusLabel(mailbox.status)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#647069]">
            {meta.label} · {getSyncAuthorizationCopy(mailbox)}
            {latestLog
              ? ` · ${formatActivityMessage(latestLog.message)}`
              : " · 等待首次同步"}
          </p>
          {latestLog ? (
            <p className="mt-1 text-[11px] font-black text-[#647069]/80">
              {formatActivityTime(latestLog.finishedAt ?? latestLog.startedAt)}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 md:min-w-[150px]">
          <SyncControls mailbox={mailbox} />
        </div>
      </div>
    </article>
  );
}

function SyncControls({ mailbox }: { mailbox: MailboxWithActivity }) {
  const needsReauth =
    (mailbox.provider === "gmail" || mailbox.provider === "outlook") &&
    !mailbox.authorized;

  return (
    <>
      {needsReauth ? (
        <button
          className="w-full cursor-not-allowed rounded-full border border-[#142a24]/[.14] bg-[#111e1a]/[.04] px-4 py-2 text-xs font-black text-[#647069]"
          disabled
          type="button"
        >
          暂停同步
        </button>
      ) : (
        <SyncNowButton mailboxId={mailbox.id} provider={mailbox.provider} />
      )}
      <TestConnectionButton mailboxId={mailbox.id} provider={mailbox.provider} />
      {mailbox.provider === "gmail" ? (
        <Link
          className="grid min-h-9 place-items-center rounded-full border border-[#142a24]/[.14] px-4 text-center text-xs font-black text-[#30433d] transition hover:-translate-y-px hover:border-[#0b6b66]/35 hover:text-[#0b5551]"
          href="/api/auth/gmail/start?scope=gmail"
        >
          {mailbox.authorized ? "重新授权" : "补全授权"}
        </Link>
      ) : null}
      {mailbox.provider === "outlook" ? (
        <Link
          className="grid min-h-9 place-items-center rounded-full border border-[#142a24]/[.14] px-4 text-center text-xs font-black text-[#30433d] transition hover:-translate-y-px hover:border-[#0b6b66]/35 hover:text-[#0b5551]"
          href="/api/auth/outlook/start?scope=mail"
        >
          {mailbox.authorized ? "重新授权" : "补全授权"}
        </Link>
      ) : null}
      <RemoveMailboxForm
        address={mailbox.address}
        mailboxId={mailbox.id}
        provider={mailbox.provider}
      />
    </>
  );
}
