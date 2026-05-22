type ProviderPillProps = {
  label: string;
  tone?: "primary" | "secondary" | "neutral";
};

const toneClassName: Record<NonNullable<ProviderPillProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-secondary-container/35 text-secondary border-secondary-container/70",
  neutral: "bg-white/55 text-slate-700 border-white/60",
};

export function ProviderPill({
  label,
  tone = "neutral",
}: ProviderPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClassName[tone]}`}
    >
      {label}
    </span>
  );
}
