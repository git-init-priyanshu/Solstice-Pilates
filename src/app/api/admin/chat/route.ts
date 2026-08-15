import { useDatabase as sheetApi } from "@/lib/database";
import { runAgentLoop } from "@/lib/chat/agentLoop";
import { adminInstructions } from "@/lib/chat/chatConstants";
import { createOpenAIClient } from "@/lib/chat/chatHelpers";
import { isAdminUser, isAllowlistedAdmin } from "@/lib/adminAuth";
import type { ChatRequestBody } from "@/types/chat.types";

const { upsertChatSession, upsertUserProfile } = sheetApi();

const fallbackReply =
  "Sorry, I couldn't complete that just now. Could you rephrase or try again?";

export async function POST(request: Request) {
  try {
    const body: ChatRequestBody = await request.json();
    const messages = body.messages?.filter(
      (message) => message.role === "user" || message.role === "assistant",
    ) ?? [];

    if (!messages.length) {
      return Response.json(
        { message: "At least one admin message is required." },
        { status: 400 },
      );
    }

    const toolContext = {
      chatId: body.chatId ?? crypto.randomUUID(),
      userId: body.userId,
    };

    if (!toolContext.userId || !(await isAdminUser(toolContext.userId))) {
      return Response.json(
        { message: "Admin access is required." },
        { status: 403 },
      );
    }

    await upsertUserProfile({
      lastChatSessionId: toolContext.chatId,
      role: isAllowlistedAdmin(toolContext.userId) ? "admin" : "user",
      userId: toolContext.userId,
    });

    const { reply, lastIntent } = await runAgentLoop({
      client: createOpenAIClient(),
      instructions: adminInstructions,
      scope: "admin",
      messages,
      toolContext,
      initialIntent: "admin_chat",
      fallbackReply,
    });

    await upsertChatSession({
      chatId: toolContext.chatId,
      conversation: JSON.stringify([
        ...messages,
        {
          role: "assistant",
          content: reply,
        },
      ]),
      lastIntent,
      userId: toolContext.userId || "",
    });

    return Response.json({ reply, chatId: toolContext.chatId });
  } catch {
    return Response.json(
      {
        message: "The admin assistant could not reply.",
      },
      { status: 500 },
    );
  }
}
