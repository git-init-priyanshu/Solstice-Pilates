export type UserProfileInput = {
  userId: string;
  bookedEventId?: string;
  bookingStatus?: string;
  lastChatSessionId?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: "admin" | "user";
};

export type ChatSessionInput = {
  chatId: string;
  userId: string;
  conversation?: string;
  conversationSummary?: string;
  lastIntent?: string;
  bookingStatus?: string;
};

export type AppendChatMessagesInput = {
  chatId: string;
  messages: Array<{ role: string; content: string }>;
  lastIntent?: string;
  bookingStatus?: string;
  userId?: string;
  conversationSummary?: string;
  dedupeLast?: boolean;
};
