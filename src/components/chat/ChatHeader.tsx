"use client";

import { Button } from "@/components/ui/button";
import { CalendarDays, Phone, Video } from "lucide-react";

export default function ChatHeader() {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-blue-100 px-4 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="min-w-0 leading-tight">
          <h1 className="m-0 text-base font-semibold tracking-normal text-blue-700">
            Solstice Pilates
          </h1>
          <p className="m-0 text-xs text-slate-500">
            AI receptionist
            <span className="mx-1.5 text-blue-200">/</span>
            Online
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-1.5 sm:flex">
        <Button variant="outline">
          <CalendarDays />
          Book
        </Button>
        <Button size="icon" variant="outline" aria-label="Call studio">
          <Phone />
        </Button>
        <Button size="icon" variant="outline" aria-label="Start video call">
          <Video />
        </Button>
      </div>

      <div className="flex items-center gap-1.5 sm:hidden">
        <Button size="icon" variant="outline" aria-label="Call studio">
          <Phone />
        </Button>
      </div>
    </header>
  );
}
