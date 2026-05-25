import { redirect } from "next/navigation";
import {
  AetherSidebar,
  MobileBottomNav,
  MobileTopBar,
} from "@/components/shell/aether-sidebar";
import { SymbolIcon } from "@/components/shell/aether-icons";
import { getCurrentUser } from "@/modules/auth";
import { getUserMailboxes } from "@/modules/mailboxes";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const mailboxes = await getUserMailboxes(user.id);

  return (
    <main className="surface-grid min-h-screen bg-background text-slate-950">
      <MobileTopBar />
      <AetherSidebar
        active="Settings"
        connectedAccountCount={mailboxes.length}
      />

      <section className="flex min-h-screen items-start justify-center px-4 pb-28 pt-24 md:ml-64 md:px-12 md:pt-24">
        <div className="w-full max-w-lg">
          <header className="mb-10 text-center">
            <h1 className="gradient-text font-display text-[44px] font-extrabold leading-[1.2] md:text-[56px] md:leading-[1.1]">
              Settings
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Your account overview
            </p>
          </header>

          <article className="glass-card relative overflow-hidden rounded-xl p-8">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-secondary-container font-label text-sm font-bold text-white">
                  {user.email.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
                    Email
                  </p>
                  <p className="text-base font-medium text-slate-950">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="h-px bg-white/50" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
                    Role
                  </p>
                  <p className="text-base capitalize text-slate-950">
                    {user.role}
                  </p>
                </div>
                <SymbolIcon className="text-[22px] text-slate-400">
                  {user.role === "owner" ? "star" : "hub"}
                </SymbolIcon>
              </div>

              <div className="h-px bg-white/50" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-label text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
                    Connected Mailboxes
                  </p>
                  <p className="text-base text-slate-950">
                    {mailboxes.length}
                  </p>
                </div>
                <SymbolIcon className="text-[22px] text-slate-400">
                  mail
                </SymbolIcon>
              </div>

              <div className="h-px bg-white/50" />

              <form action="/logout" method="POST">
                <button
                  className="hover-lift flex w-full items-center justify-center gap-2 rounded-full border border-red-400 px-6 py-3 font-label text-xs font-semibold uppercase tracking-[0.1em] text-red-600 transition hover:bg-red-50"
                  type="submit"
                >
                  <SymbolIcon className="text-[20px]">lock</SymbolIcon>
                  Logout
                </button>
              </form>
            </div>
          </article>
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
