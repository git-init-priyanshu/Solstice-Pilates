"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, RefreshCcw, Send } from "lucide-react";

import ChatHeader from "@/components/chat/ChatHeader";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Button } from "@/components/ui/button";
import type { OpenAIChatMessage } from "@/types/openai.types";
import type { ChatSessionRecord, UserProfile } from "@/types/session.types";

type HandoffChat = {
  chat: ChatSessionRecord;
  messages: OpenAIChatMessage[];
  user: UserProfile;
};

export default function AdminPage() {
  const [adminUserId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const storedUserId =
      localStorage.getItem("solstice_pilates_admin_user_id") ||
      crypto.randomUUID();

    localStorage.setItem("solstice_pilates_admin_user_id", storedUserId);

    return storedUserId;
  });
  const [chats, setChats] = useState<HandoffChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [reply, setReply] = useState("");
  const [selectedChatId, setSelectedChatId] = useState("assistant");

  useEffect(() => {
    async function loadChats() {
      if (!adminUserId) {
        return;
      }

      await fetch(`/api/chat/session?userId=${adminUserId}&role=admin`);

      const response = await fetch("/api/admin/handoffs");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to load handoff chats.");
      }

      const nextChats = (payload.chats ?? []) as HandoffChat[];

      setChats(nextChats);
      setSelectedChatId((currentChatId) =>
        currentChatId === "assistant" ||
        nextChats.some((chat) => chat.user.userId === currentChatId)
          ? currentChatId
          : "assistant",
      );
    }

    loadChats()
      .catch(() => {
        setChats([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [adminUserId]);

  const selectedHandoffChat =
    selectedChatId === "assistant"
      ? null
      : chats.find((chat) => chat.user.userId === selectedChatId) || null;

  async function refreshChats() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/handoffs");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to load handoff chats.");
      }

      const nextChats = (payload.chats ?? []) as HandoffChat[];

      setChats(nextChats);
      setSelectedChatId((currentChatId) =>
        currentChatId === "assistant" ||
        nextChats.some((chat) => chat.user.userId === currentChatId)
          ? currentChatId
          : "assistant",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedReply = reply.trim();

    if (!selectedHandoffChat || !trimmedReply || !adminUserId || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/admin/handoffs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminUserId,
          reply: trimmedReply,
          userId: selectedHandoffChat.user.userId,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to send the admin reply.");
      }

      setChats((currentChats) =>
        currentChats.map((chat) =>
          chat.user.userId === selectedHandoffChat.user.userId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    role: "assistant",
                    content: trimmedReply,
                  },
                ],
              }
            : chat,
        ),
      );
      setReply("");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="h-svh overflow-hidden bg-blue-50 p-4 text-slate-950 md:p-8">
      <section className="mx-auto flex h-full max-w-6xl overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
        <aside className="flex w-full max-w-xs shrink-0 flex-col border-r border-blue-100">
          <ChatHeader subtitle="Admin chats" title="Solstice Pilates Admin" />
          <div className="border-b border-blue-100 p-3">
            <Button
              className="w-full"
              disabled={isLoading}
              onClick={refreshChats}
              type="button"
            >
              {isLoading ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <RefreshCcw />
              )}
              Refresh
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <button
              className={`w-full border-b border-blue-50 px-4 py-3 text-left transition hover:bg-blue-50 ${
                selectedChatId === "assistant" ? "bg-blue-50" : "bg-white"
              }`}
              onClick={() => setSelectedChatId("assistant")}
              type="button"
            >
              <p className="text-sm font-semibold text-slate-950">Assistant</p>
              <p className="mt-1 truncate text-sm text-slate-600">
                Create events and manage the studio schedule.
              </p>
            </button>

            {chats.map((chat) => {
              const lastMessage = [...chat.messages]
                .reverse()
                .find((message) => message.role === "user");

              return (
                <button
                  className={`w-full border-b border-blue-50 px-4 py-3 text-left transition hover:bg-blue-50 ${
                    selectedHandoffChat?.user.userId === chat.user.userId
                      ? "bg-blue-50"
                      : "bg-white"
                  }`}
                  key={chat.user.userId}
                  onClick={() => setSelectedChatId(chat.user.userId)}
                  type="button"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {chat.user.name || "Unnamed user"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {chat.user.email || chat.user.phone || chat.user.userId}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-600">
                    {lastMessage?.content || "No user message yet."}
                  </p>
                </button>
              );
            })}

            {!isLoading && !chats.length ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                No handoff chats right now.
              </div>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {selectedChatId === "assistant" ? (
            <div className="flex h-full min-h-0">
              <ChatPanel
                apiPath="/api/admin/chat"
                placeholder="Create an event, update a class, or ask about the schedule"
                role="admin"
                subtitle="Admin assistant"
                title="Assistant"
                typingLabel="Assistant is typing..."
                userIdStorageKey="solstice_pilates_admin_user_id"
              />
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <ChatHeader
                subtitle={
                  selectedHandoffChat
                    ? `${selectedHandoffChat.user.email || "No email"} · ${selectedHandoffChat.user.phone || "No phone"}`
                    : "Select a user conversation"
                }
                title={selectedHandoffChat?.user.name || "Human handoff"}
              />

              <div className="border-b border-blue-100 bg-white px-4 py-3 text-sm text-slate-600">
                {selectedHandoffChat
                  ? `Reply here to continue ${selectedHandoffChat.user.name || "this user's"} conversation.`
                  : "Choose a handoff chat to reply."}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-blue-50 px-4 py-5">
                <div className="flex flex-col gap-4">
                  {selectedHandoffChat?.messages.map((message, index) => (
                    <div
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      key={`${message.role}-${index}-${message.content}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-lg px-4 py-3 text-left shadow-sm ${
                          message.role === "user"
                            ? "bg-blue-700 text-white"
                            : "border border-blue-100 bg-white text-slate-950"
                        }`}
                      >
                        <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                          {message.role === "user" ? "User" : "Assistant"}
                        </p>
                        <p className="mt-1 text-sm leading-6">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {!selectedHandoffChat && !isLoading ? (
                    <div className="text-sm text-slate-500">
                      No conversation selected.
                    </div>
                  ) : null}
                </div>
              </div>

              <form
                className="shrink-0 border-t border-blue-100 bg-white p-3"
                onSubmit={sendReply}
              >
                <div className="flex items-end gap-2">
                  <textarea
                    className="min-h-10 flex-1 resize-none rounded-md border border-blue-100 bg-white px-3 py-2 text-sm leading-5 text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    disabled={!selectedHandoffChat || isSending}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Write the assistant reply for this user"
                    rows={1}
                    value={reply}
                  />
                  <Button
                    aria-label="Send reply"
                    disabled={!selectedHandoffChat || isSending || !reply.trim()}
                    type="submit"
                  >
                    {isSending ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Send />
                    )}
                    {isSending ? "Sending" : "Send"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
