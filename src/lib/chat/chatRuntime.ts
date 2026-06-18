import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import type { OpenAIChatMessage } from "@/types/openai.types";
import type { UserProfile } from "@/types/session.types";

export type ChatRequestBody = {
  chatId?: string;
  messages?: OpenAIChatMessage[];
  userId?: string;
  userProfile?: Pick<UserProfile, "email" | "name" | "phone">;
};

export function createKnownUserContext(
  userProfile: ChatRequestBody["userProfile"],
): ChatCompletionMessageParam | null {
  if (!userProfile) {
    return null;
  }

  const details = [
    userProfile.name ? `name: ${userProfile.name}` : null,
    userProfile.email ? `email: ${userProfile.email}` : null,
    userProfile.phone ? `phone: ${userProfile.phone}` : null,
  ].filter(Boolean);

  if (details.length === 0) {
    return null;
  }

  return {
    role: "system",
    content: `Known client details: ${details.join(", ")}. Reuse these details when relevant and only ask for missing identity information.`,
  };
}

function getCurrentDateTimeParts(timeZone: string) {
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

  return {
    date: [
      parts.find((part) => part.type === "year")?.value,
      parts.find((part) => part.type === "month")?.value,
      parts.find((part) => part.type === "day")?.value,
    ].join("-"),
    time: [
      parts.find((part) => part.type === "hour")?.value,
      parts.find((part) => part.type === "minute")?.value,
      parts.find((part) => part.type === "second")?.value,
    ].join(":"),
  };
}

export function createCurrentDateContext() {
  const timeZone = process.env.GOOGLE_TIME_ZONE || "UTC";
  const { date, time } = getCurrentDateTimeParts(timeZone);

  return {
    role: "system" as const,
    content: `Current studio timezone: ${timeZone}. Current local date: ${date}. Current local time: ${time}. Resolve relative dates like today, tomorrow, and this afternoon using this timezone.`,
  };
}
