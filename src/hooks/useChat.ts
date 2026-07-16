"use client";

import { useEffect, useState, type FormEvent } from "react";

import type { ChatMessage, UseChatOptions } from "@/types/chat.types";
import type { OpenAIChatMessage } from "@/types/openai.types";
import type { ChatSessionInit, UserProfile } from "@/types/session.types";

import { useOpenAi } from "@/hooks/useOpenAi";

function getCurrentTime() {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

export function useChat({
  apiPath,
  role = "user",
  sessionApiPath,
  userIdStorageKey,
}: UseChatOptions) {
  const { getLLMReply } = useOpenAi();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<
    Pick<UserProfile, "email" | "name" | "phone">
  >({
    name: "",
    email: "",
    phone: "",
  });
  const [userId, setUserId] = useState("");
  const [isHandoff, setIsHandoff] = useState(false);
  const storageKey = userIdStorageKey || "solstice_pilates_user_id";

  useEffect(() => {
    async function loadSession() {
      const existingUserId = localStorage.getItem(storageKey);

      if (!existingUserId) {
        const newUserId = crypto.randomUUID();
        localStorage.setItem(storageKey, newUserId);

        setUserId(newUserId);
        setChatId(crypto.randomUUID());
        setIsLoading(false);
        return;
      }

      setUserId(existingUserId);

      try {
        const response = await fetch(
          `${sessionApiPath}?userId=${existingUserId}&role=${role}`,
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error("Unable to load the session.");
        }

        const session = payload as ChatSessionInit;

        setChatId(session.chat.id);
        setIsHandoff(session.chat.lastIntent === "human_handoff");
        setMessages(
          session.messages.map<ChatMessage>((message) => ({
            id: crypto.randomUUID(),
            sender: message.role === "user" ? "User" : "LLM",
            text: message.content,
          })),
        );
        setProfile({
          email: session.user.email,
          name: session.user.name,
          phone: session.user.phone,
        });
      } catch {
        setChatId(crypto.randomUUID());
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [role, sessionApiPath, storageKey]);

  useEffect(() => {
    if (!isHandoff || !userId) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${sessionApiPath}?userId=${userId}`);
        const payload = await response.json();

        if (!response.ok) {
          return;
        }

        const session = payload as ChatSessionInit;

        setIsHandoff(session.chat.lastIntent === "human_handoff");

        if (session.messages.length > messages.length) {
          setMessages(
            session.messages.map<ChatMessage>((message) => ({
              id: crypto.randomUUID(),
              sender: message.role === "user" ? "User" : "LLM",
              text: message.content,
            })),
          );
        }
      } catch {
        // Keep polling; transient failures are non-fatal.
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isHandoff, userId, sessionApiPath, messages.length]);

  async function submitChatMessage() {
    const trimmedInput = chatInput.trim();

    if (!trimmedInput || isLoading || !chatId || !userId) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "User",
      text: trimmedInput,
      time: getCurrentTime(),
    };
    const allMessages = [...messages, userMessage];

    setMessages(allMessages);
    setChatInput("");
    setIsLoading(true);

    try {
      const modelMessages: OpenAIChatMessage[] = allMessages.map((message) => ({
        role: message.sender === "User" ? "user" : "assistant",
        content: message.text,
      }));
      const { reply, chatId: serverChatId } = await getLLMReply({
        apiPath,
        chatId,
        messages: modelMessages,
        userId,
        userProfile: profile,
      });

      if (serverChatId && serverChatId !== chatId) {
        setChatId(serverChatId);
      }

      if (reply) {
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: crypto.randomUUID(),
            sender: "LLM",
            text: reply,
            time: getCurrentTime(),
          },
        ]);
      } else {
        setIsHandoff(true);
      }
    } catch {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          sender: "LLM",
          text: "Sorry, the server seems to be down.",
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitChatMessage();
  }

  return {
    chatId,
    chatInput,
    handleChatSubmit,
    isLoading,
    messages,
    profile,
    setChatInput,
    submitChatMessage,
    userId,
  };
}
