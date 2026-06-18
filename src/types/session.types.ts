import type { OpenAIChatMessage } from "@/types/openai.types";

export type UserProfile = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  bookingStatus: string;
  bookedEventId: string;
  lastChatSessionId: string;
  createdAt: string;
  role: "admin" | "user";
};

export type ChatSessionRecord = {
  id: string;
  userId: string;
  conversation: string;
  conversationSummary: string;
  lastIntent: string;
  bookingStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatSessionInit = {
  user: UserProfile;
  chat: ChatSessionRecord;
  messages: OpenAIChatMessage[];
};
