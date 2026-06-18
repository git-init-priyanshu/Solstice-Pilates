"use client";

import { useEffect, useState, type FormEvent } from "react";

import type { ChatMessage } from "@/types/chat.types";
import type { OpenAIChatMessage } from "@/types/openai.types";
import type { ChatSessionBootstrap, UserProfile } from "@/types/session.types";

import { useOpenAi } from "@/hooks/useOpenAi";
import { createChatId, getOrCreateUserId } from "@/lib/clientIdentity";

type UseChatOptions = {
  apiPath?: string;
  sessionApiPath?: string;
  userIdStorageKey?: string;
};

function createMessageId() {
  return crypto.randomUUID();
}

function getCurrentTime() {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function toChatMessages(messages: OpenAIChatMessage[]) {
  return messages.map<ChatMessage>((message) => ({
    id: createMessageId(),
    sender: message.role === "user" ? "User" : "LLM",
    text: message.content,
  }));
}

function createEmptyProfile() {
  return {
    name: "",
    email: "",
    phone: "",
  };
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return fallback;
}

export function useChat({
  apiPath = "/api/chat",
  sessionApiPath = "/api/chat/session",
  userIdStorageKey,
}: UseChatOptions = {}) {
  const { getLLMReply } = useOpenAi();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isReplying, setIsReplying] = useState(false);
  const [profile, setProfile] =
    useState<Pick<UserProfile, "email" | "name" | "phone">>(createEmptyProfile);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    let isActive = true;

    async function bootstrapSession() {
      const nextUserId = getOrCreateUserId(userIdStorageKey);

      setUserId(nextUserId);

      try {
        const response = await fetch(
          `${sessionApiPath}?userId=${encodeURIComponent(nextUserId)}`,
        );
        const payload = (await response.json()) as unknown;

        if (!response.ok) {
          throw new Error(getErrorMessage(payload, "Unable to load the session."));
        }

        if (!isActive) {
          return;
        }

        const session = payload as ChatSessionBootstrap;

        setChatId(session.chat.id);
        setMessages(toChatMessages(session.messages));
        setProfile({
          email: session.user.email,
          name: session.user.name,
          phone: session.user.phone,
        });
      } catch {
        if (!isActive) {
          return;
        }

        setChatId(createChatId());
      } finally {
        if (isActive) {
          setIsBootstrapping(false);
        }
      }
    }

    bootstrapSession();

    return () => {
      isActive = false;
    };
  }, [sessionApiPath, userIdStorageKey]);

  async function submitChatMessage() {
    const trimmedInput = chatInput.trim();

    if (!trimmedInput || isBootstrapping || isReplying || !chatId || !userId) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      sender: "User",
      text: trimmedInput,
      time: getCurrentTime(),
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setChatInput("");
    setIsReplying(true);

    try {
      const modelMessages: OpenAIChatMessage[] = nextMessages.map((message) => ({
        role: message.sender === "User" ? "user" : "assistant",
        content: message.text,
      }));
      const reply = await getLLMReply({
        apiPath,
        chatId,
        messages: modelMessages,
        userId,
        userProfile: profile,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          sender: "LLM",
          text: reply,
          time: getCurrentTime(),
        },
      ]);
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          sender: "LLM",
          text:
            error instanceof Error
              ? error.message
              : "Sorry, the server seems to be down.",
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setIsReplying(false);
    }
  }

  function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitChatMessage();
  }

  return {
    chatInput,
    handleChatSubmit,
    isBootstrapping,
    isReplying,
    messages,
    setChatInput,
    submitChatMessage,
  };
}

export type Chat = ReturnType<typeof useChat>;
