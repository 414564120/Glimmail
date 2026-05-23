import Link from "next/link";
import { redirect } from "next/navigation";
import { SymbolIcon } from "@/components/shell/aether-icons";
import { PasswordInput } from "@/components/ui/password-input";
import { getCurrentUser } from "@/modules/auth";
import { signIn } from "./actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/inbox");
  }

  const params = await searchParams;
  const hasInvalidCredentials = params?.error === "invalid";
  const nextPath = params?.next || "/inbox";

  return (
    <main className="surface-grid relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="aether-orb left-[15%] top-[10%] h-64 w-64 animate-[float_6s_ease-in-out_infinite] bg-secondary-container/20" />
      <div className="aether-orb bottom-[20%] right-[10%] h-96 w-96 animate-[float_8s_ease-in-out_infinite_2s] bg-primary-container/15" />
      <div className="aether-orb right-[25%] top-[40%] h-32 w-32 animate-[float_7s_ease-in-out_infinite_1s] bg-tertiary/15 blur-2xl" />
      <div className="login-shape left-[9%] top-[24%] hidden size-16 rounded-[22px] bg-gradient-to-br from-secondary-container/35 to-white/45 md:block" />
      <div className="login-shape bottom-[16%] right-[18%] hidden h-12 w-24 rounded-full bg-gradient-to-r from-primary-container/35 to-tertiary/20 md:block" />
      <div className="login-shape right-[13%] top-[18%] hidden size-10 rounded-full bg-gradient-to-br from-tertiary/25 to-secondary-container/25 md:block" />

      <button
        className="hover-lift fixed right-4 top-8 z-10 flex size-12 items-center justify-center rounded-full border border-white/40 bg-white/60 text-primary shadow-sm backdrop-blur-xl md:right-8"
        aria-label="Toggle theme"
        type="button"
      >
        <SymbolIcon className="text-[22px]">light_mode</SymbolIcon>
      </button>

      <section className="glass-card glow-ring relative z-[1] w-full max-w-[448px] rounded-xl p-8 md:p-10">
        <div className="mb-10 text-center">
          <h1 className="font-display text-[48px] font-extrabold leading-[1.1] text-primary md:text-[64px]">
            AetherMail
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            Sign in to continue
          </p>
        </div>

        <form action={signIn} className="space-y-6">
          <input name="next" type="hidden" value={nextPath} />
          <label className="block space-y-2">
            <span className="ml-1 block font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
              Email Address
            </span>
            <span className="relative block">
              <SymbolIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-500">
                mail
              </SymbolIcon>
              <input
                className="w-full rounded-xl border border-outline-variant bg-white/45 py-3 pl-11 pr-4 text-base leading-relaxed text-slate-900 outline-none backdrop-blur-sm transition-all duration-300 placeholder:text-outline hover:border-primary/30 focus:border-secondary-container focus:ring-2 focus:ring-secondary-container/50"
                id="email"
                name="email"
                placeholder="hello@example.com"
                required
                type="email"
              />
            </span>
          </label>

          <label className="block space-y-2">
            <span className="ml-1 flex items-center justify-between">
              <span className="font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
                Password
              </span>
            </span>
            <PasswordInput id="password" name="password" />
          </label>

          {hasInvalidCredentials ? (
            <p className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700">
              Email address or password is incorrect.
            </p>
          ) : null}

          <button
            className="vibrant-flux hover-lift mt-8 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white shadow-[0_0_20px_rgba(168,0,170,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.4)]"
            type="submit"
          >
            Sign In
            <SymbolIcon className="text-[20px]">
              arrow_forward
            </SymbolIcon>
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-600">
          Don&apos;t have an account?
          <Link
            className="ml-1 font-semibold text-primary transition hover:text-tertiary"
            href="/register"
          >
            Create one
          </Link>
        </p>
      </section>
    </main>
  );
}
