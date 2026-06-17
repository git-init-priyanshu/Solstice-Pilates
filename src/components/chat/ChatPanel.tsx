import { type KeyboardEvent } from "react";
import { CalendarDays, Phone, Send, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Chat } from "@/hooks/useChat";

type ChatPanelProps = Pick<
  Chat,
  | "chatInput"
  | "handleChatSubmit"
  | "isChatLoading"
  | "messages"
  | "setChatInput"
  | "submitChatMessage"
>;

export function ChatPanel({
  chatInput,
  handleChatSubmit,
  isChatLoading,
  messages,
  setChatInput,
  submitChatMessage,
}: ChatPanelProps) {
  function handleEnterKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !!chatInput.trim()) {
      event.preventDefault();
      submitChatMessage();
    }
  }

  return (
    <section className="flex min-h-[640px] min-w-0 overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-blue-100 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h1 className="m-0 text-lg font-semibold tracking-normal text-blue-700">
                Solstice Pilates
              </h1>
              <p className="text-sm text-slate-500">
                AI receptionist
                <span className="mx-2 text-blue-200">/</span>
                Online
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
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

          <div className="flex items-center gap-2 sm:hidden">
            <Button size="icon" variant="outline" aria-label="Call studio">
              <Phone />
            </Button>
          </div>
        </header>

        <div className="border-b border-blue-100 bg-blue-50 px-4 py-3">
          <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2 text-left text-sm text-blue-700">
            <span className="rounded-md border border-blue-100 bg-white px-2 py-1">
              New client bookings
            </span>
            <span className="rounded-md border border-blue-100 bg-white px-2 py-1">
              Class schedule
            </span>
            <span className="rounded-md border border-blue-100 bg-white px-2 py-1">
              Membership questions
            </span>
          </div>
        </div>

        <div className="overflow-y-auto bg-blue-50 px-4 py-5">
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <p
                className={`flex ${message.mine ? "justify-end" : "justify-start"}`}
                key={message.id}
              >
                <div
                  className={`max-w-[78%] rounded-lg px-4 py-3 text-left shadow-sm ${
                    message.mine
                      ? "bg-blue-700 text-white"
                      : "border border-blue-100 bg-white text-slate-950"
                  }`}
                >
                  <p className="text-sm leading-6">{message.text}</p>
                  <span
                    className={`mt-2 block text-right text-xs ${
                      message.mine ? "text-blue-100" : "text-slate-500"
                    }`}
                  >
                    {message.time}
                  </span>
                </div>
              </p>
            ))}
            {isChatLoading && (
              <p className="flex justify-start">
                <div className="rounded-lg border border-blue-100 bg-white px-4 py-3 text-left text-sm text-slate-500 shadow-sm">
                  Solstice Pilates is typing...
                </div>
              </p>
            )}
          </div>
        </div>

        <form
          className="flex items-center gap-2 border-t border-blue-100 bg-white p-3"
          onSubmit={handleChatSubmit}
        >
          <textarea
            className="min-h-10 flex-1 resize-none rounded-md border border-blue-100 bg-white px-3 py-2 text-sm leading-5 text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            disabled={isChatLoading}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="Ask about classes, booking, pricing, or call the studio"
            rows={1}
            value={chatInput}
            onKeyDown={handleEnterKeyDown}
          />
          <Button
            aria-label="Send message"
            disabled={isChatLoading || !chatInput.trim()}
            type="submit"
          >
            <Send />
            {isChatLoading ? "Sending" : "Send"}
          </Button>
        </form>
      </section>
    </section>
  );
}
