"use client";

import type { ChatHeaderProps } from "@/types/chat.types";

export default function ChatHeader({
  subtitle,
  title,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-blue-100 px-4 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="min-w-0 leading-tight">
          <h1 className="m-0 text-base font-semibold tracking-normal text-blue-700">
            {title}
          </h1>
          <p className="m-0 text-xs text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}
