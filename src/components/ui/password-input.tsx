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
      <SymbolIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-[#647069]">
        lock
      </SymbolIcon>
      <input
        className="w-full rounded-xl border border-[#142a24]/18 bg-white/55 py-3 pl-11 pr-12 text-base leading-relaxed text-[#111e1a] outline-none transition placeholder:text-[#647069]/55 hover:border-[#0b5551]/35 focus:border-[#0b5551] focus:ring-2 focus:ring-[#87f2c5]/35"
        id={id}
        name={name}
        placeholder={placeholder}
        required
        type={visible ? "text" : "password"}
      />
      <button
        aria-label={visible ? "隐藏密码" : "显示密码"}
        className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#647069] transition hover:text-[#0b5551]"
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
