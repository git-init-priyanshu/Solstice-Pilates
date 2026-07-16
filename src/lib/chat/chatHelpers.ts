import OpenAI from "openai";

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import type { ChatRequestBody } from "@/types/chat.types";
import type { OpenAIChatMessage } from "@/types/openai.types";

export const chatModel = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

export function createOpenAIClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Add OPENROUTER_API_KEY to use the assistant.");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      ...(process.env.APP_URL ? { "HTTP-Referer": process.env.APP_URL } : {}),
      "X-Title": "Solstice Pilates",
    },
  });
}

export function getLatestUserMessage(messages: OpenAIChatMessage[]) {
  return (
    [...messages].reverse().find((message) => message.role === "user")
      ?.content || ""
  );
}

export function createKnownUserContext(
  userProfile: ChatRequestBody["userProfile"],
): ChatCompletionMessageParam | null {
  if (!userProfile) {
    return null;
  }

  const details: string[] = [];

  if (userProfile.name) {
    details.push(`name: ${userProfile.name}`);
  }

  if (userProfile.email) {
    details.push(`email: ${userProfile.email}`);
  }

  if (userProfile.phone) {
    details.push(`phone: ${userProfile.phone}`);
  }

  if (!details.length) {
    return null;
  }

  return {
    role: "system",
    content: `Known client details: ${details.join(", ")}. Reuse these details when relevant and only ask for missing identity information.`,
  };
}

export function createCurrentDateContext() {
  const timeZone =
    process.env.GOOGLE_TIME_ZONE ||
    process.env.NEXT_PUBLIC_GOOGLE_TIME_ZONE ||
    "UTC";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date());
  const getPart = (
    type: "year" | "month" | "day" | "hour" | "minute" | "second",
  ) => parts.find((part) => part.type === type)?.value || "";

  const currentLocalDate = [
    getPart("year"),
    getPart("month"),
    getPart("day"),
  ].join("-");

  const currentLocalTime = [
    getPart("hour"),
    getPart("minute"),
    getPart("second"),
  ].join(":");

  return {
    role: "system" as const,
    content: `Current timezone: ${timeZone}. Current local date: ${currentLocalDate}. Current local time: ${currentLocalTime}. Resolve relative dates like today, tomorrow, and this afternoon using this timezone.`,
  };
}
