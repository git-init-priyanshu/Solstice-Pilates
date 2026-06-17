"use client";

import { useState, type FormEvent } from "react";

import type { ChatMessage } from "@/types/chat.types";
import type { OpenAIChatMessage } from "@/types/openai.types";

import { useOpenAi } from "@/hooks/useOpenAi";
import { createChatId, getOrCreateUserId } from "@/lib/clientIdentity";

function createMessageId() {
  return crypto.randomUUID();
}

function getCurrentTime() {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

export function useChat() {
  const { getLLMReply } = useOpenAi();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId] = useState(createChatId);
  const [chatInput, setChatInput] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  async function submitChatMessage() {
    const trimmedInput = chatInput.trim();

    if (!trimmedInput || isReplying) {
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
      const modelMessages: OpenAIChatMessage[] = nextMessages.map(
        (message) => ({
          role: message.sender === "User" ? "user" : "assistant",
          content: message.text,
        }),
      );
      const reply = await getLLMReply({
        chatId,
        messages: modelMessages,
        userId: getOrCreateUserId(),
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
              : "Sorry for the inconvinience the server seems to be down.",
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
    isReplying,
    messages,
    setChatInput,
    submitChatMessage,
  };
}

export type Chat = ReturnType<typeof useChat>;
