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
