export function AppLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="vibrant-flux glow-ring flex size-11 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-lg">
        GM
      </div>
      <div>
        <div className="font-display text-xl font-extrabold tracking-tight text-primary">
          Glimmail
        </div>
        <div className="font-label text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/60">
          Unified Inbox
        </div>
      </div>
    </div>
  );
}
