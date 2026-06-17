"use client";

import { type KeyboardEvent } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import ChatHeader from "@/components/chat/ChatHeader";
import { useChat } from "@/hooks/useChat";

export function ChatPanel() {
  const {
    chatInput,
    handleChatSubmit,
    isReplying,
    messages,
    setChatInput,
    submitChatMessage,
  } = useChat();

  function handleEnterKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !!chatInput.trim()) {
      event.preventDefault();
      submitChatMessage();
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <ChatHeader />
      <div className="min-h-0 flex-1 overflow-y-auto bg-blue-50 px-4 py-5">
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <article
              className={`flex ${message.sender === "User" ? "justify-end" : "justify-start"}`}
              key={message.id}
            >
              <div
                className={`max-w-[78%] rounded-lg px-4 py-3 text-left shadow-sm ${
                  message.sender === "User"
                    ? "bg-blue-700 text-white"
                    : "border border-blue-100 bg-white text-slate-950"
                }`}
              >
                <p className="text-sm leading-6">{message.text}</p>
                <span
                  className={`mt-2 block text-right text-xs ${
                    message.sender === "User"
                      ? "text-blue-100"
                      : "text-slate-500"
                  }`}
                >
                  {message.time}
                </span>
              </div>
            </article>
          ))}
          {isReplying && (
            <article className="flex justify-start">
              <div className="rounded-lg border border-blue-100 bg-white px-4 py-3 text-left text-sm text-slate-500 shadow-sm">
                Solstice Pilates is typing...
              </div>
            </article>
          )}
        </div>
      </div>

      <form
        className="shrink-0 border-t border-blue-100 bg-white p-3"
        onSubmit={handleChatSubmit}
      >
        <div className="flex items-end gap-2">
          <textarea
            className="min-h-10 flex-1 resize-none rounded-md border border-blue-100 bg-white px-3 py-2 text-sm leading-5 text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isReplying}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Ask about classes, booking, pricing, or call the studio"
            rows={1}
            value={chatInput}
            onKeyDown={handleEnterKeyDown}
          />
          <Button
            aria-label="Send message"
            disabled={isReplying || !chatInput.trim()}
            type="submit"
          >
            <Send />
            {isReplying ? "Sending" : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
