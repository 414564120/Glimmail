import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { MailboxProvider } from "@prisma/client";
import {
  AetherSidebar,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/shell/aether-sidebar";
import { SymbolIcon } from "@/components/shell/aether-icons";
import { getCurrentUser } from "@/modules/auth";
import { getUserMailboxes } from "@/modules/mailboxes";
import {
  isValidProvider,
  PROVIDER_DOMAIN_LABELS,
} from "@/modules/mailboxes/validation";
import { addMailboxAction } from "../actions";

const PROVIDER_CONFIG: Record<
  MailboxProvider,
  { name: string; iconClass: string; description: string; accent: string }
> = {
  gmail: {
    name: "Gmail",
    iconClass: "gmail-mark",
    description: "使用 Google OAuth 连接账号。读取收件箱需要后续单独授权。",
    accent: "#87f2c5",
  },
  outlook: {
    name: "Outlook",
    iconClass: "outlook-mark",
    description: "使用 Microsoft OAuth 连接账号。邮件同步权限会在连接后单独申请。",
    accent: "#4fd7ff",
  },
  mail163: {
    name: "163 邮箱",
    iconClass: "netease-mark",
    description: "使用 163 邮箱客户端授权码连接 IMAP 收件箱。",
    accent: "#ff6b57",
  },
};

interface PageProps {
  searchParams: Promise<{ provider?: string; error?: string }>;
}

function normalizeErrorMessage(error: string | undefined): string | null {
  const normalized = error?.trim();
  if (!normalized) return null;

  if (normalized === "Unknown provider.") return "未知邮箱服务商。";
  if (normalized === "Please enter a valid email address.") {
    return "请输入有效的邮箱地址。";
  }
  if (normalized.startsWith("Email must be a ")) {
    return normalized
      .replace("Email must be a ", "邮箱地址必须属于 ")
      .replace(" address.", "。");
  }
  if (normalized === "This address is already connected.") {
    return "这个邮箱地址已经连接。";
  }
  if (normalized === "Failed to add mailbox. Please try again.") {
    return "连接邮箱失败，请稍后重试。";
  }

  return "连接失败，请检查信息后重试。";
}

export default async function ConnectPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/mailboxes");
  }

  const { provider: providerParam, error } = await searchParams;

  if (!isValidProvider(String(providerParam ?? ""))) {
    redirect("/mailboxes");
  }

  const provider = providerParam as MailboxProvider;
  const errorMessage = normalizeErrorMessage(error);
  const config = PROVIDER_CONFIG[provider];
  const domainHint = PROVIDER_DOMAIN_LABELS[provider];
  const is163 = provider === "mail163";
  const isGmail = provider === "gmail";
  const isOutlook = provider === "outlook";
  const mailboxes = await getUserMailboxes(user.id);

  let gmailSetupRedirectUri: string | null = null;
  const gmailOAuthConfigured =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

  let outlookSetupRedirectUri: string | null = null;
  const outlookOAuthConfigured =
    !!process.env.MICROSOFT_CLIENT_ID && !!process.env.MICROSOFT_CLIENT_SECRET;

  if (isGmail || isOutlook) {
    const headerStore = await headers();
    const host =
      headerStore.get("x-forwarded-host") ??
      headerStore.get("host") ??
      "localhost:3000";
    const proto =
      headerStore.get("x-forwarded-proto") ??
      (host.startsWith("localhost") ? "http" : "https");
    if (isGmail) {
      gmailSetupRedirectUri = `${proto}://${host}/api/auth/gmail/callback`;
    }
    if (isOutlook) {
      outlookSetupRedirectUri = `${proto}://${host}/api/auth/outlook/callback`;
    }
  }

  return (
    <main className="surface-grid min-h-[100dvh] bg-background text-[#f4f5e9]">
      <MobileTopBar />
      <AetherSidebar
        active="Accounts"
        connectedAccountCount={mailboxes.length}
      />

      <section className="flex min-h-[100dvh] items-start justify-center px-4 pb-28 pt-24 md:ml-64 md:px-12 md:pt-24">
        <div className="w-full max-w-3xl">
          <Link
            className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[#f4f5e9]/68 transition hover:text-[#d7ff47]"
            href="/mailboxes"
          >
            <SymbolIcon className="rotate-180 text-[18px]">arrow_forward</SymbolIcon>
            返回账号管理
          </Link>

          {errorMessage ? (
            <div className="mb-6 rounded-2xl border border-[#ff6b57]/35 bg-[#ff6b57]/12 px-4 py-3 text-sm font-medium text-[#ffd2cb]">
              {errorMessage}
            </div>
          ) : null}

          <article className="relative overflow-hidden rounded-[28px] border border-white/12 bg-[#0a1b18]/88 p-3 shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
            <div className="rounded-[22px] bg-[#f7f1df] p-6 text-[#111e1a] md:p-8">
              <div className="mb-7 grid gap-5 border-b border-[#142a24]/14 pb-6 md:grid-cols-[auto_1fr] md:items-center">
                <div
                  className="flex size-20 items-center justify-center rounded-3xl border border-[#142a24]/12 bg-white shadow-[0_18px_38px_rgba(7,20,18,0.1)]"
                  style={{ boxShadow: `0 18px 38px ${config.accent}22` }}
                >
                  <span className={`provider-logo ${config.iconClass}`} />
                </div>
                <div>
                  <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#647069]">
                    连接邮箱
                  </p>
                  <h2 className="text-3xl font-black tracking-tight">
                    连接 {config.name}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#647069]">
                    {config.description}
                  </p>
                </div>
              </div>

            {isGmail ? (
              <>
                {gmailOAuthConfigured ? (
                  <div className="mb-6 rounded-2xl border border-[#4fd7ff]/25 bg-[#4fd7ff]/10 px-4 py-3 text-sm leading-6 text-[#0b5551]">
                    将跳转到 Google 授权账号资料访问。Gmail 收件箱同步需要连接后再授权只读邮件权限。
                  </div>
                ) : (
                  <div className="mb-6 rounded-2xl border border-[#ffb35c]/35 bg-[#ffb35c]/12 px-4 py-3 text-left text-sm text-[#7a4a10]">
                    <p className="font-label text-[10px] font-bold uppercase tracking-wider text-[#7a4a10]">
                      需要配置 Google OAuth
                    </p>
                    <p className="mt-2 leading-relaxed">
                      在 Google Cloud Console 创建 OAuth Web 应用，配置客户端 ID 和客户端密钥后重启服务。
                    </p>
                    <div className="mt-3 space-y-2 rounded-xl bg-white/55 p-3 text-xs text-[#4c3412]">
                      <p>
                        <span className="font-semibold">需要配置：</span>{" "}
                        <span className="font-mono">GOOGLE_CLIENT_ID</span>,{" "}
                        <span className="font-mono">GOOGLE_CLIENT_SECRET</span>
                      </p>
                      <p>
                        <span className="font-semibold">回调地址：</span>{" "}
                        <span className="break-all font-mono">
                          {gmailSetupRedirectUri}
                        </span>
                      </p>
                      <p>
                        将上面的回调地址加入 Authorized redirect URIs。
                      </p>
                    </div>
                  </div>
                )}
                {gmailOAuthConfigured ? (
                  <a
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071412] px-6 py-3 font-label text-sm font-black text-[#f4f5e9] transition hover:-translate-y-0.5 hover:bg-[#102621] active:translate-y-0"
                    href="/api/auth/gmail/start"
                  >
                    使用 Google 连接
                    <SymbolIcon>arrow_forward</SymbolIcon>
                  </a>
                ) : (
                  <button
                    className="w-full cursor-not-allowed rounded-xl border border-[#142a24]/18 px-6 py-3 font-label text-sm font-bold text-[#647069]/60"
                    disabled
                    type="button"
                  >
                    Google 配置未完成
                  </button>
                )}
              </>
            ) : isOutlook ? (
              <>
                {outlookOAuthConfigured ? (
                  <div className="mb-6 rounded-2xl border border-[#4fd7ff]/25 bg-[#4fd7ff]/10 px-4 py-3 text-sm leading-6 text-[#0b5551]">
                    将跳转到 Microsoft 授权账号资料访问。邮件同步需要连接后再单独授权 Mail.Read。
                  </div>
                ) : (
                  <div className="mb-6 rounded-2xl border border-[#ffb35c]/35 bg-[#ffb35c]/12 px-4 py-3 text-left text-sm text-[#7a4a10]">
                    <p className="font-label text-[10px] font-bold uppercase tracking-wider text-[#7a4a10]">
                      需要配置 Microsoft OAuth
                    </p>
                    <p className="mt-2 leading-relaxed">
                      在 Azure Portal 注册应用，配置客户端 ID 和客户端密钥后重启服务。
                    </p>
                    <div className="mt-3 space-y-2 rounded-xl bg-white/55 p-3 text-xs text-[#4c3412]">
                      <p>
                        <span className="font-semibold">需要配置：</span>{" "}
                        <span className="font-mono">MICROSOFT_CLIENT_ID</span>,{" "}
                        <span className="font-mono">MICROSOFT_CLIENT_SECRET</span>
                      </p>
                      <p>
                        <span className="font-semibold">回调地址：</span>{" "}
                        <span className="break-all font-mono">
                          {outlookSetupRedirectUri}
                        </span>
                      </p>
                      <p>
                        将上面的回调地址加入 Authentication 的 Redirect URIs。
                      </p>
                    </div>
                  </div>
                )}
                {outlookOAuthConfigured ? (
                  <a
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071412] px-6 py-3 font-label text-sm font-black text-[#f4f5e9] transition hover:-translate-y-0.5 hover:bg-[#102621] active:translate-y-0"
                    href="/api/auth/outlook/start"
                  >
                    使用 Microsoft 连接
                    <SymbolIcon>arrow_forward</SymbolIcon>
                  </a>
                ) : (
                  <button
                    className="w-full cursor-not-allowed rounded-xl border border-[#142a24]/18 px-6 py-3 font-label text-sm font-bold text-[#647069]/60"
                    disabled
                    type="button"
                  >
                    Microsoft 配置未完成
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="mb-6 rounded-2xl border border-[#142a24]/12 bg-white/45 px-4 py-3 text-sm text-[#647069]">
                  可连接域名：{domainHint}
                </p>

                <form action={addMailboxAction}>
                  <input name="provider" type="hidden" value={provider} />
                  <input
                    name="returnTo"
                    type="hidden"
                    value={`/mailboxes/connect?provider=${provider}`}
                  />
                  <input
                    className="mb-4 w-full rounded-xl border border-[#142a24]/18 bg-white/55 px-4 py-3 text-center text-base text-[#111e1a] outline-none transition placeholder:text-[#647069]/55 hover:border-[#0b5551]/35 focus:border-[#0b5551] focus:ring-2 focus:ring-[#87f2c5]/35"
                    name="address"
                    placeholder="you@163.com"
                    required
                    type="email"
                  />

                  {is163 ? (
                    <>
                      <input
                        className="mb-3 w-full rounded-xl border border-[#142a24]/18 bg-white/55 px-4 py-3 text-center text-base text-[#111e1a] outline-none transition placeholder:text-[#647069]/55 hover:border-[#0b5551]/35 focus:border-[#0b5551] focus:ring-2 focus:ring-[#87f2c5]/35"
                        name="authCode"
                        placeholder="163 客户端授权码"
                        type="password"
                      />
                      <p className="mb-4 text-xs leading-relaxed text-[#647069]">
                        使用 163 邮箱设置中的客户端授权码，不要填写邮箱登录密码。授权码会在保存前加密。
                      </p>
                    </>
                  ) : null}

                  <button
                    className="w-full rounded-xl bg-[#071412] px-6 py-3 font-label text-sm font-black text-[#f4f5e9] transition hover:-translate-y-0.5 hover:bg-[#102621] active:translate-y-0"
                    type="submit"
                  >
                    连接账号
                  </button>
                </form>
              </>
            )}
            </div>
          </article>
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
