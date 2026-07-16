import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { useDatabase as sheetApi } from "@/lib/database";
import { adminInstructions, maxToolRounds } from "@/lib/chat/chatConstants";
import {
  chatModel,
  createCurrentDateContext,
  createOpenAIClient,
} from "@/lib/chat/chatHelpers";
import { adminEventTools } from "@/lib/tools/event";
import { executeEventTool } from "@/lib/tools/eventToolExecutor";
import { isAdminUser, isAllowlistedAdmin } from "@/lib/adminAuth";
import type { ChatRequestBody } from "@/types/chat.types";

const { upsertChatSession, upsertUserProfile } = sheetApi();

export async function POST(request: Request) {
  try {
    const body: ChatRequestBody = await request.json();
    const messages = body.messages?.filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
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

    const client = createOpenAIClient();
    let lastIntent = "admin_chat";
    const conversationMemory: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: adminInstructions,
      },
      createCurrentDateContext(),
      ...messages,
    ];

    for (let round = 0; round < maxToolRounds; round += 1) {
      const response = await client.chat.completions.create({
        model: chatModel,
        messages: conversationMemory,
        tools: adminEventTools,
        tool_choice: "auto",
      });
      const llmMessage = response.choices[0]?.message;

      if (!llmMessage) {
        break;
      }

      const toolCalls = llmMessage.tool_calls ?? [];

      if (!toolCalls.length) {
        const reply = llmMessage.content;

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
      }

      conversationMemory.push({
        role: "assistant",
        content: llmMessage.content,
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") {
          continue;
        }

        const result = await executeEventTool(toolCall);

        lastIntent = result.intent ?? "";

        conversationMemory.push({
          role: "tool",
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        });
      }
    }

    return Response.json(
      {
        message: "The assistant is taking too long to process the request.",
      },
      { status: 500 },
    );
  } catch {
    return Response.json(
      {
        message: "The admin assistant could not reply.",
      },
      { status: 500 },
    );
  }
}
