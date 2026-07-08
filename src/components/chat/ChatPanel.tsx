"use client";

import { type KeyboardEvent } from "react";
import { LoaderCircle, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import ChatHeader from "@/components/chat/ChatHeader";
import { useChat } from "@/hooks/useChat";
import { useVapiCall } from "@/hooks/useVapiCall";
import type { ChatPanelProps } from "@/types/chat.types";

export function ChatPanel({
  apiPath = "/api/chat",
  placeholder = "Ask about classes, booking, pricing, or call the studio",
  role = "user",
  sessionApiPath = "/api/chat/session",
  showThemeToggle = false,
  subtitle = "AI assistant",
  title = "Solstice Pilates",
  typingLabel = "Solstice Pilates is typing...",
  userIdStorageKey,
}: ChatPanelProps) {
  const {
    chatId,
    chatInput,
    handleChatSubmit,
    isLoading,
    messages,
    profile,
    setChatInput,
    submitChatMessage,
    userId,
  } = useChat({
    apiPath,
    role,
    sessionApiPath,
    userIdStorageKey,
  });
  
  const {
    callStatus,
    endCall,
    hasAssistant,
    isReady: isVoiceReady,
    startCall,
  } = useVapiCall({
    assistantId: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || "",
    chatId,
    publicKey: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "",
    userId,
    userProfile: profile,
  });

  function handleEnterKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !!chatInput.trim()) {
      event.preventDefault();
      submitChatMessage();
    }
  }

  const lastMessage = messages[messages.length - 1];
  const isAwaitingReply = isLoading && lastMessage?.sender === "User";

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <ChatHeader
        callStatus={callStatus}
        hasAssistant={hasAssistant}
        isVoiceReady={isVoiceReady}
        onEndCall={endCall}
        onStartCall={startCall}
        showThemeToggle={showThemeToggle}
        subtitle={subtitle}
        title={title}
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 px-4 py-5">
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <div
              className={`flex ${message.sender === "User" ? "justify-end" : "justify-start"}`}
              key={message.id}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-left shadow-sm ${
                  message.sender === "User"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm border border-border bg-card text-card-foreground"
                }`}
              >
                <p className="text-sm leading-6">{message.text}</p>
                {message.time ? (
                  <span
                    className={`mt-2 block text-right text-xs ${
                      message.sender === "User"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {message.time}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
          {isAwaitingReply && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground shadow-sm">
                {typingLabel}
              </div>
            </div>
          )}
        </div>
      </div>

      <form
        className="shrink-0 border-t border-border bg-card p-3"
        onSubmit={handleChatSubmit}
      >
        <div className="flex items-end gap-2">
          <textarea
            className="min-h-10 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            disabled={isLoading}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder={placeholder}
            rows={1}
            value={chatInput}
            onKeyDown={handleEnterKeyDown}
          />
          <Button
            aria-label="Send message"
            disabled={isLoading || !chatInput.trim()}
            type="submit"
          >
            {isLoading ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Send />
            )}
            {isLoading ? "Sending" : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
