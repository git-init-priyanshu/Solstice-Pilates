import { useDatabase as sheetApi } from "@/lib/database";
import type { OpenAIChatMessage } from "@/types/openai.types";
import type { ChatSessionRecord, UserProfile } from "@/types/session.types";

const { findUserById, findChatById } = sheetApi();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ message: "userId is required." }, { status: 400 });
    }

    const user = await findUserById(userId);
    const chat = user ? await findChatById(user.lastChatSessionId) : null;

    if (user && chat) {
      return Response.json({
        user,
        chat,
        messages: chat.conversation
          ? (JSON.parse(chat.conversation) as OpenAIChatMessage[])
          : [],
      });
    }

    const now = new Date().toISOString();
    const ephemeralUser: UserProfile = {
      userId,
      name: "",
      email: "",
      phone: "",
      bookingStatus: "",
      bookedEventId: "",
      lastChatSessionId: "",
      createdAt: now,
      role: "user",
    };
    const ephemeralChat: ChatSessionRecord = {
      id: crypto.randomUUID(),
      userId,
      conversation: "",
      conversationSummary: "",
      lastIntent: "",
      bookingStatus: "",
      createdAt: now,
      updatedAt: now,
    };

    return Response.json({
      user: ephemeralUser,
      chat: ephemeralChat,
      messages: [],
    });
  } catch {
    return Response.json(
      {
        message: "Unable to load the chat session.",
      },
      { status: 500 },
    );
  }
}
