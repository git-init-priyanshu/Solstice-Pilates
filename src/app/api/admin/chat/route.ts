import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

import { createSheetClient } from "@/hooks/useSheet";
import {
  adminInstructions,
  maxToolRounds,
} from "@/lib/chat/chatConstants";
import {
  createCurrentDateContext,
  type ChatRequestBody,
} from "@/lib/chat/chatRuntime";
import {
  createOpenAIClient,
  getModel,
  isValidMessage,
} from "@/lib/chat/chatHelpers";
import { adminEventTools } from "@/lib/tools/event";
import { executeEventTool } from "@/lib/tools/eventToolExecutor";

const { upsertChatSession, upsertUserProfile } = createSheetClient();

async function persistConversation({
  chatId,
  lastIntent,
  messages,
  reply,
  userId,
}: {
  chatId: string;
  lastIntent: string;
  messages: ChatRequestBody["messages"];
  reply: string;
  userId?: string;
}) {
  await upsertChatSession({
    chatId,
    conversation: JSON.stringify([
      ...(messages || []),
      {
        role: "assistant",
        content: reply,
      },
    ]),
    lastIntent,
    userId: userId || "",
  });
}

export async function POST(request: Request) {
  try {
    const body: ChatRequestBody = await request.json();
    const messages = Array.isArray(body.messages)
      ? body.messages.filter(isValidMessage)
      : [];

    if (messages.length === 0) {
      return Response.json(
        { message: "At least one admin message is required." },
        { status: 400 },
      );
    }

    const toolContext = {
      chatId: body.chatId || crypto.randomUUID(),
      userId: body.userId || undefined,
    };

    if (toolContext.userId) {
      await upsertUserProfile({
        userId: toolContext.userId,
        lastChatSessionId: toolContext.chatId,
      });
    }

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
        model: getModel(),
        messages: conversationMemory,
        tools: adminEventTools,
        tool_choice: "auto",
      });
      const llmMessage = response.choices[0]?.message;

      if (!llmMessage) {
        break;
      }

      const toolCalls = llmMessage.tool_calls ?? [];

      if (toolCalls.length === 0) {
        const reply =
          llmMessage.content ||
          "I can help with that. Could you share a little more detail?";

        try {
          await persistConversation({
            chatId: toolContext.chatId,
            lastIntent,
            messages,
            reply,
            userId: toolContext.userId,
          });
        } catch {
          // Session logging is best-effort so admin replies still return.
        }

        return Response.json({ reply });
      }

      const llmToolMessage: ChatCompletionAssistantMessageParam = {
        role: "assistant",
        content: llmMessage.content,
        tool_calls: toolCalls,
      };

      conversationMemory.push(llmToolMessage);

      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") {
          continue;
        }

        const result = await executeEventTool(toolCall);

        if (result.intent) {
          lastIntent = result.intent;
        }

        conversationMemory.push({
          role: "tool",
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        });
      }
    }

    const reply =
      "I need a moment to finish that. Please try again with the exact event details.";

    try {
      await persistConversation({
        chatId: toolContext.chatId,
        lastIntent,
        messages,
        reply,
        userId: toolContext.userId,
      });
    } catch {
      // Session logging is best-effort so admin replies still return.
    }

    return Response.json({ reply });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "The admin assistant could not reply.",
      },
      { status: 500 },
    );
  }
}
