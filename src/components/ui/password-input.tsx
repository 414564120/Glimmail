"use client";

import { useState } from "react";
import { SymbolIcon } from "@/components/shell/aether-icons";

type PasswordInputProps = {
  id: string;
  name: string;
  placeholder?: string;
};

export function PasswordInput({
  id,
  name,
  placeholder = "••••••••",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative block">
      <SymbolIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-500">
        lock
      </SymbolIcon>
      <input
        className="w-full rounded-xl border border-outline-variant bg-white/45 py-3 pl-11 pr-12 text-base leading-relaxed text-slate-900 outline-none backdrop-blur-sm transition-all duration-300 placeholder:text-outline hover:border-primary/30 focus:border-secondary-container focus:ring-2 focus:ring-secondary-container/50"
        id={id}
        name={name}
        placeholder={placeholder}
        required
        type={visible ? "text" : "password"}
      />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 transition hover:text-primary"
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        <SymbolIcon className="text-[20px]">
          {visible ? "visibility_off" : "visibility"}
        </SymbolIcon>
      </button>
    </span>
  );
}
