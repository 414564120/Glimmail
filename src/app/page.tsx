import Link from "next/link";
import { SymbolIcon } from "@/components/shell/aether-icons";
import { getCurrentUser } from "@/modules/auth";

const providers = ["Gmail", "Outlook", "163 邮箱"];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#071412] text-[#f4f5e9]">
      <section className="relative mx-auto grid min-h-[100dvh] w-full max-w-7xl grid-cols-1 gap-10 px-5 py-6 md:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] md:px-8 lg:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.9),transparent_82%)]" />

        <div className="relative flex min-h-[68dvh] flex-col justify-between pt-3 md:min-h-0 md:py-6">
          <nav className="flex items-center justify-between gap-4">
            <Link className="group inline-flex items-center gap-3" href="/">
              <span className="grid size-12 place-items-center rounded-2xl border border-[#d7ff47]/35 bg-[#d7ff47] text-sm font-black text-[#071412] shadow-[0_18px_42px_rgba(215,255,71,0.16)] transition group-hover:-translate-y-0.5">
                GL
              </span>
              <span className="text-lg font-black tracking-tight">Glimmail</span>
            </Link>
            <Link
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-[#f4f5e9]/80 transition hover:border-[#d7ff47]/45 hover:text-[#d7ff47]"
              href={user ? "/inbox" : "/login"}
            >
              {user ? "进入收件箱" : "登录"}
            </Link>
          </nav>

          <div className="max-w-3xl py-16 md:py-20">
            <p className="mb-5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#d7ff47]">
              Unified Mail Cockpit
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.96] tracking-tight text-balance md:text-7xl">
              Glimmail 把分散邮箱合并成一个中文工作台。
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-[#f4f5e9]/68 md:text-lg">
              同时接入 Gmail、Outlook 和 163 邮箱，集中查看最近收件箱邮件、验证码和同步状态。凭据加密保存，同步日志只保留安全摘要。
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d7ff47] px-6 py-3 text-sm font-black text-[#071412] transition hover:-translate-y-0.5 active:translate-y-0"
                href={user ? "/inbox" : "/login"}
              >
                {user ? "打开统一收件箱" : "登录"}
                <SymbolIcon>arrow_forward</SymbolIcon>
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-white/16 px-6 py-3 text-sm font-bold text-[#f4f5e9]/76 transition hover:border-[#87f2c5]/45 hover:text-[#87f2c5] active:translate-y-px"
                href="/register"
              >
                创建首个账号
              </Link>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/12 pt-5 sm:grid-cols-3">
            {providers.map((provider) => (
              <div className="flex items-center gap-3" key={provider}>
                <span className="size-2.5 rounded-full bg-[#87f2c5]" />
                <span className="text-sm font-bold text-[#f4f5e9]/72">
                  支持 {provider}
                </span>
              </div>
            ))}
          </div>
        </div>

        <aside className="relative flex items-center pb-8 md:pb-0">
          <div className="w-full rounded-[28px] border border-white/12 bg-[#0a1b18]/86 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
            <div className="rounded-[22px] bg-[#f7f1df] p-5 text-[#111e1a]">
              <div className="mb-5 flex items-center justify-between border-b border-[#142a24]/14 pb-4">
                <div>
                  <p className="font-mono text-xs font-bold text-[#647069]">
                    今日处理
                  </p>
                  <p className="text-4xl font-black tracking-tight">18</p>
                </div>
                <span className="rounded-full bg-[#d7ff47] px-3 py-1 text-xs font-black">
                  已同步
                </span>
              </div>

              <div className="space-y-3">
                {[
                  ["Outlook", "连接到 Microsoft 账号的新应用", "#4fd7ff"],
                  ["Gmail", "安全提醒与验证码邮件", "#87f2c5"],
                  ["163 邮箱", "客户端授权码已启用", "#ff6b57"],
                ].map(([source, title, color]) => (
                  <div
                    className="rounded-2xl border border-[#142a24]/12 bg-white/45 p-4"
                    key={source}
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <span className="text-sm font-black">{source}</span>
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    <p className="text-sm font-bold leading-6 text-[#30433d]">
                      {title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
