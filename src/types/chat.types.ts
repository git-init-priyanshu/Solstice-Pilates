import type { OpenAIChatMessage } from "@/types/openai.types";
import type { UserProfile } from "@/types/session.types";

export type ChatMessage = {
  id: string;
  sender: "User" | "LLM";
  text: string;
  time?: string;
};

export type ChatRequestBody = {
  chatId?: string;
  messages?: OpenAIChatMessage[];
  userId?: string;
  userProfile?: Pick<UserProfile, "email" | "name" | "phone">;
};

export type UseChatOptions = {
  apiPath: string;
  sessionApiPath?: string;
  userIdStorageKey?: string;
};

export type ChatPanelProps = {
  apiPath?: string;
  placeholder?: string;
  sessionApiPath?: string;
  subtitle?: string;
  title?: string;
  typingLabel?: string;
  userIdStorageKey?: string;
};

export type ChatHeaderProps = {
  subtitle: string;
  title: string;
};

export type LLMReplyInput = {
  apiPath: string;
  chatId: string;
  messages: OpenAIChatMessage[];
  userId: string;
  userProfile: Pick<UserProfile, "email" | "name" | "phone">;
};
