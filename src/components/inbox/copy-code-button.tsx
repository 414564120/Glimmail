"use client";

import { useState } from "react";
import { SymbolIcon } from "@/components/shell/aether-icons";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — no fallback needed.
    }
  }

  return (
    <button
      className="vibrant-flux hover-lift mx-auto flex items-center justify-center gap-2 rounded-full px-8 py-3 font-label text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-[0_0_15px_rgba(168,0,170,0.4)]"
      onClick={handleCopy}
      type="button"
    >
      <SymbolIcon className="text-[20px]">content_copy</SymbolIcon>
      {copied ? "Copied!" : "Copy Code"}
    </button>
  );
}
