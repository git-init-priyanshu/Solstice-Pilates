import type { OpenAIChatMessage } from "@/types/openai.types";

import { useDatabase as sheetApi } from "@/lib/database";

const {
  findChatById,
  findUserById,
  listHandoffChats,
  upsertChatSession,
  upsertUserProfile,
} = sheetApi();

function isAuthorizedAdmin(request: Request) {
  const secret = process.env.ADMIN_API_SECRET;
  const authorization = request.headers.get("authorization");

  return !secret || authorization === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const chats = await listHandoffChats();

    return Response.json({
      chats: chats.map(({ chat, user }) => ({
        chat,
        messages: chat.conversation
          ? (JSON.parse(chat.conversation) as OpenAIChatMessage[])
          : [],
        user,
      })),
    });
  } catch {
    return Response.json(
      {
        message: "Unable to load handoff chats.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      adminUserId?: string;
      reply?: string;
      userId?: string;
    };
    const reply = body.reply?.trim() || "";

    if (!body.userId || !reply) {
      return Response.json(
        { message: "userId and reply are required." },
        { status: 400 },
      );
    }

    if (body.adminUserId) {
      await upsertUserProfile({
        role: "admin",
        userId: body.adminUserId,
      });
    }

    const user = await findUserById(body.userId);

    if (!user?.lastChatSessionId) {
      return Response.json(
        { message: "The target user chat was not found." },
        { status: 404 },
      );
    }

    const chat = await findChatById(user.lastChatSessionId);

    if (!chat) {
      return Response.json(
        { message: "The target user chat was not found." },
        { status: 404 },
      );
    }

    const messages = chat.conversation
      ? (JSON.parse(chat.conversation) as OpenAIChatMessage[])
      : [];

    await upsertChatSession({
      bookingStatus: chat.bookingStatus,
      chatId: chat.id,
      conversation: JSON.stringify([
        ...messages,
        {
          role: "assistant",
          content: reply,
        },
      ]),
      lastIntent: "human_handoff",
      userId: user.userId,
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      {
        message: "Unable to send the admin reply.",
      },
      { status: 500 },
    );
  }
}
