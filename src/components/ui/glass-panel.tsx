import type { ReactNode } from "react";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
};

export function GlassPanel({ children, className }: GlassPanelProps) {
  return (
    <div className={`glass-panel rounded-[24px] ${className ?? ""}`.trim()}>
      {children}
    </div>
  );
}
