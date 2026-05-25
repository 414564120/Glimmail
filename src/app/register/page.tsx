import Link from "next/link";
import { redirect } from "next/navigation";
import { SymbolIcon } from "@/components/shell/aether-icons";
import { PasswordInput } from "@/components/ui/password-input";
import { getCurrentUser } from "@/modules/auth";
import { register } from "./actions";

type RegisterPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  const code = error?.trim();
  if (!code) return null;
  if (code === "password_mismatch") return "两次输入的密码不一致。";
  if (code === "registration_disabled") {
    return "首个账号已创建，当前部署已关闭公开注册。";
  }
  return "注册失败，请检查信息后重试。";
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/mailboxes");
  }

  const params = await searchParams;
  const errorMessage = getErrorMessage(params?.error);

  return (
    <main className="relative grid min-h-[100dvh] overflow-hidden bg-[#071412] px-4 py-6 text-[#f4f5e9] md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.86),transparent_84%)]" />

      <section className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 md:grid-cols-[minmax(0,0.9fr)_448px]">
        <div className="hidden md:block">
          <Link className="mb-16 inline-flex items-center gap-3" href="/">
            <span className="grid size-12 place-items-center rounded-2xl border border-[#d7ff47]/35 bg-[#d7ff47] text-sm font-black text-[#071412]">
              GL
            </span>
            <span className="text-lg font-black tracking-tight">Glimmail</span>
          </Link>

          <p className="mb-5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#d7ff47]">
            First Owner Bootstrap
          </p>
          <h1 className="max-w-2xl text-5xl font-black leading-[0.98] tracking-tight text-balance">
            创建这台部署的首个账号。
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-[#f4f5e9]/66">
            Glimmail 的注册入口用于自托管部署初始化。首个用户创建后，公开注册会关闭，后续用户管理应由部署者按策略处理。
          </p>
        </div>

        <section className="w-full rounded-[28px] border border-white/12 bg-[#0a1b18]/88 p-3 shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
          <div className="rounded-[22px] bg-[#f7f1df] p-6 text-[#111e1a] md:p-8">
            <div className="mb-8">
              <Link className="mb-8 inline-flex items-center gap-3 md:hidden" href="/">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#d7ff47] text-sm font-black text-[#071412]">
                  GL
                </span>
                <span className="text-lg font-black tracking-tight">Glimmail</span>
              </Link>
              <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#647069]">
                初始化
              </p>
              <h2 className="text-3xl font-black tracking-tight">创建首个账号</h2>
              <p className="mt-2 text-sm leading-6 text-[#647069]">
                用于部署所有者登录和连接邮箱。
              </p>
            </div>

        <form action={register} className="space-y-6">
          <label className="block space-y-2">
            <span className="ml-1 block font-label text-xs font-bold uppercase tracking-[0.1em] text-[#647069]">
              邮箱地址
            </span>
            <span className="relative block">
              <SymbolIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-[#647069]">
                mail
              </SymbolIcon>
              <input
                className="w-full rounded-xl border border-[#142a24]/18 bg-white/55 py-3 pl-11 pr-4 text-base leading-relaxed text-[#111e1a] outline-none transition placeholder:text-[#647069]/55 hover:border-[#0b5551]/35 focus:border-[#0b5551] focus:ring-2 focus:ring-[#87f2c5]/35"
                id="email"
                name="email"
                placeholder="hello@example.com"
                required
                type="email"
              />
            </span>
          </label>

          <label className="block space-y-2">
            <span className="ml-1 block font-label text-xs font-bold uppercase tracking-[0.1em] text-[#647069]">
              密码
            </span>
            <PasswordInput id="password" name="password" />
          </label>

          <label className="block space-y-2">
            <span className="ml-1 block font-label text-xs font-bold uppercase tracking-[0.1em] text-[#647069]">
              确认密码
            </span>
            <PasswordInput id="confirmPassword" name="confirmPassword" />
          </label>

          {errorMessage ? (
            <p className="rounded-xl border border-[#ff6b57]/35 bg-[#ff6b57]/10 px-4 py-3 text-sm font-medium text-[#9e2f23]">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#071412] py-3.5 text-base font-black text-[#f4f5e9] transition hover:-translate-y-0.5 hover:bg-[#102621] active:translate-y-0"
            type="submit"
          >
            创建账号
            <SymbolIcon className="text-[20px]">arrow_forward</SymbolIcon>
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#647069]">
          已经完成初始化？
          <Link
            className="ml-1 font-bold text-[#0b5551] transition hover:text-[#071412]"
            href="/login"
          >
            登录
          </Link>
        </p>
          </div>
      </section>
      </section>
    </main>
  );
}
