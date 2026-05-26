import Link from "next/link";
import { redirect } from "next/navigation";
import type { Mailbox, SyncLog } from "@prisma/client";
import {
  AetherSidebar,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/shell/aether-sidebar";
import { SymbolIcon } from "@/components/shell/aether-icons";
import { getCurrentUser } from "@/modules/auth";
import { getLatestSyncLog, getUserMailboxes } from "@/modules/mailboxes";

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
  return "bg-[#87f2c5]";
}

function getStatusLabel(status: string) {
  if (status === "error") return "需要处理";
  if (status === "disconnected") return "已断开";
  return "正常同步";
}

function formatDateTime(date: Date | null | undefined) {
  if (!date) return "暂无记录";

  return date.toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

function formatSyncLog(log: SyncLog | null | undefined) {
  if (!log) return "等待首次同步";
  if (log.status === "success") return log.message?.trim() || "最近同步完成";
  if (log.status === "running") return "正在同步";
  return log.message?.trim() || "最近同步需要处理";
}

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

type MailboxWithSync = Mailbox & {
  latestSyncLog: SyncLog | null;
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const mailboxes = await getUserMailboxes(user.id);
  const latestSyncEntries = await Promise.all(
    mailboxes.map(async (mailbox) => ({
      mailbox,
      latestSyncLog: await getLatestSyncLog(user.id, mailbox.id),
    })),
  );
  const mailboxesWithSync: MailboxWithSync[] = latestSyncEntries.map(
    ({ latestSyncLog, mailbox }) => ({
      ...mailbox,
      latestSyncLog,
    }),
  );
  const connectedCount = mailboxes.length;
  const healthyCount = mailboxes.filter(
    (mailbox) => mailbox.status === "active",
  ).length;
  const attentionCount = mailboxes.filter(
    (mailbox) => mailbox.status !== "active",
  ).length;
  const lastSyncedAt = mailboxes
    .map((mailbox) => mailbox.lastSyncedAt)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return (
    <main className="surface-grid min-h-screen bg-background text-[#f4f5e9]">
      <MobileTopBar />
      <AetherSidebar
        active="Settings"
        connectedAccountCount={mailboxes.length}
      />

      <section className="min-h-screen px-4 pb-28 pt-20 md:ml-[106px] md:p-[14px_14px_14px_0] md:pt-[14px]">
        <div className="grid min-h-[calc(100vh-28px)] gap-[14px] xl:grid-cols-[minmax(360px,430px)_minmax(520px,1fr)_330px]">
          <aside className="preview-glass-border preview-surface-82 flex min-h-0 flex-col overflow-hidden rounded-[26px] border shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
            <div className="preview-split-header-bg relative overflow-hidden border-b border-white/10 px-[22px] pb-7 pt-[22px]">
              <div className="split-drift-mark preview-split-mark-bg pointer-events-none absolute right-5 top-6 size-[82px] rounded-full opacity-70" />
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#d7ff47]">
                Glimmail Settings
              </p>
              <h1 className="max-w-[280px] text-[42px] font-black leading-[0.96] tracking-[-0.08em] text-[#f4f5e9]">
                设置中心
                <span className="block text-[#d7ff47]">{connectedCount}</span>
              </h1>
              <p className="mt-3 max-w-[278px] text-[13px] leading-[1.55] text-[#f4f5e9]/[.68]">
                管理账号、同步授权和安全出口。这里仅展示已经实现的设置入口。
              </p>
            </div>

            <div className="grid gap-2.5 p-2.5">
              {[
                ["连接账号", `${connectedCount} 个`, "mail"],
                ["正常同步", `${healthyCount} 个`, "sync"],
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
          </aside>

          <article className="relative min-h-0 overflow-hidden rounded-[30px] bg-[#f7f1df] text-[#111e1a] shadow-[0_28px_80px_rgba(7,20,18,0.18)]">
            <div className="reader-drift-mark reader-drift-mark-primary" />
            <div className="reader-drift-mark reader-drift-mark-secondary" />
            <header className="relative z-[1] border-b border-[#142a24]/[.14] px-[34px] pb-8 pt-8">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#0b6b66]">
                账号资料 / 应用设置
              </p>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <h2 className="max-w-[620px] break-all text-[42px] font-black leading-[0.98] tracking-[-0.06em] lg:text-[48px]">
                    {user.email}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-[#647069]">
                    这是当前登录账号。授权、同步和邮箱连接会跟随这个账号隔离保存。
                  </p>
                </div>
                <div className="grid size-[76px] place-items-center rounded-[24px] bg-[#071412] text-[18px] font-black text-[#d7ff47] shadow-[0_18px_42px_rgba(7,20,18,0.18)]">
                  {getInitials(user.email)}
                </div>
              </div>
            </header>

            <div className="relative z-[1] grid gap-[18px] px-[34px] py-7">
              <section className="mail-summary-strip grid gap-4 rounded-[18px] border p-[18px] md:grid-cols-3">
                <div>
                  <p className="text-[12px] font-[950] uppercase tracking-[0.12em] text-[#0b6b66]">
                    角色
                  </p>
                  <p className="mt-2 text-base font-black capitalize">
                    {user.role}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] font-[950] uppercase tracking-[0.12em] text-[#0b6b66]">
                    最近同步
                  </p>
                  <p className="mt-2 text-base font-black">
                    {formatDateTime(lastSyncedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] font-[950] uppercase tracking-[0.12em] text-[#0b6b66]">
                    安全策略
                  </p>
                  <p className="mt-2 text-base font-black">凭据加密保存</p>
                </div>
              </section>

              <section className="rounded-[22px] border border-[#142a24]/[.12] bg-[#fff8e8] p-[24px] shadow-[0_22px_60px_rgba(17,30,26,0.08)]">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-[950] uppercase tracking-[0.12em] text-[#0b6b66]">
                      Connected Mailboxes
                    </p>
                    <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">
                      邮箱连接摘要
                    </h3>
                  </div>
                  <Link
                    className="rounded-full border border-[#111e1a]/[.12] bg-[#111e1a]/[.05] px-4 py-2 text-xs font-black text-[#30433d] transition hover:-translate-y-0.5 hover:border-[#0b6b66]/35 hover:bg-[#0b6b66]/10 hover:text-[#0b5551]"
                    href="/mailboxes"
                  >
                    管理账号
                  </Link>
                </div>

                {mailboxesWithSync.length > 0 ? (
                  <div className="grid gap-3">
                    {mailboxesWithSync.map((mailbox) => (
                      <div
                        className="grid gap-3 rounded-[18px] border border-[#142a24]/[.12] bg-white/[.45] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                        key={mailbox.id}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`size-2.5 rounded-full ${getProviderTone(mailbox.provider)}`}
                            />
                            <p className="truncate text-sm font-black">
                              {mailbox.address}
                            </p>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[#647069]">
                            {getProviderLabel(mailbox.provider)} ·{" "}
                            {getStatusLabel(mailbox.status)} ·{" "}
                            {formatSyncLog(mailbox.latestSyncLog)}
                          </p>
                        </div>
                        <Link
                          className="rounded-full border border-[#142a24]/[.14] px-3 py-2 text-center text-[10px] font-black text-[#30433d] transition hover:border-[#0b6b66]/35 hover:text-[#0b5551]"
                          href="/mailboxes"
                        >
                          查看授权
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-[#142a24]/[.12] bg-white/[.45] p-5">
                    <p className="text-sm font-black">还没有连接邮箱。</p>
                    <p className="mt-2 text-sm leading-6 text-[#647069]">
                      连接 Gmail、Outlook 或 163 邮箱后，设置页会显示授权和同步状态。
                    </p>
                    <Link
                      className="mt-5 inline-flex rounded-full bg-[#071412] px-5 py-3 text-xs font-black !text-[#f4f5e9] transition hover:-translate-y-0.5 hover:bg-[#102621]"
                      href="/mailboxes"
                    >
                      连接邮箱
                    </Link>
                  </div>
                )}
              </section>

              <section className="grid gap-[18px] lg:grid-cols-2">
                <div className="rounded-[22px] border border-[#142a24]/[.12] bg-[#fff8e8] p-[24px] shadow-[0_22px_60px_rgba(17,30,26,0.08)]">
                  <p className="text-[12px] font-[950] uppercase tracking-[0.12em] text-[#0b6b66]">
                    Sync And Security
                  </p>
                  <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">
                    同步与安全
                  </h3>
                  <div className="mt-5 grid gap-3 text-sm leading-6 text-[#30433d]">
                    <p>同步只读取已授权邮箱，状态异常会在账号页提示。</p>
                    <p>OAuth 授权和 163 授权码不会在页面展示。</p>
                    <p>验证码仅在邮件阅读区提供复制，不写入聊天或日志。</p>
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#142a24]/[.12] bg-[#fff8e8] p-[24px] shadow-[0_22px_60px_rgba(17,30,26,0.08)]">
                  <p className="text-[12px] font-[950] uppercase tracking-[0.12em] text-[#0b6b66]">
                    Interface Preferences
                  </p>
                  <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">
                    界面偏好
                  </h3>
                  <p className="mt-5 text-sm leading-6 text-[#30433d]">
                    当前界面偏好还没有持久化设置。正式接入后会在这里提供可保存的选项，而不是临时开关。
                  </p>
                </div>
              </section>
            </div>
          </article>

          <aside className="hidden min-h-0 flex-col gap-[14px] xl:flex">
            <section className="context-panel-featured rounded-[24px] border p-[17px] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
              <div className="mb-[14px] flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-black leading-none tracking-[-0.03em] text-[#f4f5e9]">
                  当前账号
                </h2>
                <span className="text-xs font-[850] text-[#c4ffe2]/[.72]">
                  {user.role}
                </span>
              </div>
              <div className="grid gap-3">
                {[
                  ["账号", user.email],
                  ["连接邮箱", `${connectedCount} 个`],
                  ["最近同步", formatDateTime(lastSyncedAt)],
                ].map(([label, value]) => (
                  <div
                    className="rounded-[16px] border border-white/[0.08] bg-white/[0.045] p-[11px]"
                    key={label}
                  >
                    <p className="text-xs text-[#f4f5e9]/[.58]">{label}</p>
                    <p className="mt-1 truncate text-[13px] font-black text-[#f4f5e9]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="context-panel rounded-[24px] border p-[17px] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
              <h2 className="mb-[14px] text-[15px] font-black leading-none tracking-[-0.03em] text-[#f4f5e9]">
                授权管理
              </h2>
              <div className="grid gap-2">
                <Link
                  className="grid min-h-10 place-items-center rounded-full border border-[#d7ff47] bg-[#d7ff47] px-4 text-xs font-black text-[#071412] transition hover:-translate-y-px hover:bg-[#ecff8a]"
                  href="/mailboxes"
                >
                  管理邮箱授权
                </Link>
                <Link
                  className="grid min-h-10 place-items-center rounded-full border border-white/[.14] bg-white/[0.06] px-4 text-xs font-black text-[#f4f5e9] transition hover:-translate-y-px hover:border-[#d7ff47]/35 hover:text-[#d7ff47]"
                  href="/mailboxes"
                >
                  添加邮箱
                </Link>
              </div>
            </section>

            <section className="rounded-[24px] border border-[#ff6b57]/[.25] bg-[#ff6b57]/[.08] p-[17px] shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
              <h2 className="text-[15px] font-black leading-none tracking-[-0.03em] text-[#f4f5e9]">
                危险区
              </h2>
              <p className="mt-3 text-xs leading-5 text-[#ffd2cb]">
                退出登录只会清除当前会话，不会删除邮箱连接或同步记录。
              </p>
              <form action="/logout" className="mt-4" method="POST">
                <button
                  className="grid min-h-10 w-full place-items-center rounded-full border border-[#ff6b57]/[.35] bg-[#ff6b57]/[.14] px-4 text-xs font-black text-[#ffd2cb] transition hover:-translate-y-px hover:bg-[#ff6b57]/[.2]"
                  type="submit"
                >
                  退出登录
                </button>
              </form>
            </section>
          </aside>
        </div>
      </section>

      <MobileBottomNav
        active="Settings"
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
