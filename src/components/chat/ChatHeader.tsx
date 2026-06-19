"use client";

import { LoaderCircle, Phone, PhoneOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ChatHeaderProps } from "@/types/chat.types";

export default function ChatHeader({
  callStatus = "idle",
  hasAssistant = false,
  isVoiceReady = false,
  onEndCall = () => undefined,
  onStartCall = () => undefined,
  subtitle,
  title,
}: ChatHeaderProps) {
  const isCallActive = callStatus === "active" || callStatus === "ending";
  const isStarting = callStatus === "loading" || callStatus === "connecting";

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
      <div className="flex shrink-0 gap-2">
        <Button
          disabled={!hasAssistant || !isVoiceReady || isStarting || isCallActive}
          onClick={() => void onStartCall()}
          size="sm"
          type="button"
        >
          {isStarting ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Phone />
          )}
          {isStarting ? "Starting" : "Call"}
        </Button>
        <Button
          disabled={!isCallActive}
          onClick={onEndCall}
          size="sm"
          type="button"
          variant="outline"
        >
          <PhoneOff />
          End
        </Button>
      </div>
    </header>
  );
}
