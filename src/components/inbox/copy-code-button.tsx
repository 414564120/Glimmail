"use client";

import { useState } from "react";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable, no fallback needed.
    }
  }

  return (
    <button
      className="ml-auto shrink-0 rounded-full bg-[#d7ff47] px-[18px] py-[11px] text-xs font-black tracking-[0.02em] text-[#071412] transition hover:-translate-y-0.5 hover:bg-[#ecff8a]"
      onClick={handleCopy}
      type="button"
    >
      {copied ? "已复制" : "复制验证码"}
    </button>
  );
}
