import OpenAI from "openai";

import type { OpenAIChatMessage } from "@/types/openai.types";

export function createOpenAIClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Add OPENROUTER_API_KEY to use the receptionist.");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      ...(process.env.APP_URL ? { "HTTP-Referer": process.env.APP_URL } : {}),
      "X-OpenRouter-Title": "Solstice Pilates",
    },
  });
}

export function getModel() {
  return process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
}

export function getLatestUserMessage(messages: OpenAIChatMessage[]) {
  return (
    [...messages].reverse().find((message) => message.role === "user")
      ?.content || ""
  );
}

export function isValidMessage(
  message: unknown,
): message is OpenAIChatMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Record<string, unknown>;

  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string"
  );
}
