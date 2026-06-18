import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

import { bookingTools } from "@/lib/tools/booking";
import { eventLookupTools } from "@/lib/tools/event";
import { createSheetClient } from "@/hooks/useSheet";
import type { OpenAIChatMessage } from "@/types/openai.types";

import {
  createCurrentDateContext,
  createKnownUserContext,
  type ChatRequestBody,
} from "@/lib/chat/chatRuntime";
import {
  maxToolRounds,
  receptionistInstructions,
} from "@/lib/chat/chatConstants";
import {
  createOpenAIClient,
  getModel,
  isValidMessage,
} from "@/lib/chat/chatHelpers";
import { executeBookingTool } from "@/lib/tools/bookingToolExecutor";
import { executeEventTool } from "@/lib/tools/eventToolExecutor";

const { upsertChatSession, upsertUserProfile } = createSheetClient();

async function persistConversation({
  bookingStatus,
  chatId,
  lastIntent,
  messages,
  reply,
  userId,
}: {
  bookingStatus: string;
  chatId: string;
  lastIntent: string;
  messages: OpenAIChatMessage[];
  reply: string;
  userId?: string;
}) {
  await upsertChatSession({
    bookingStatus,
    chatId,
    conversation: JSON.stringify([
      ...messages,
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

    const toolContext = {
      chatId: body.chatId || crypto.randomUUID(),
      userId: body.userId,
    };

    if (body.userId) {
      await upsertUserProfile({
        userId: body.userId,
        lastChatSessionId: toolContext.chatId,
        name: body.userProfile?.name,
        email: body.userProfile?.email,
        phone: body.userProfile?.phone,
      });
    }

    const client = createOpenAIClient();
    let bookingStatus = "";
    let lastIntent = "chat";
    const knownUserContext = createKnownUserContext(body.userProfile);
    const conversationMemory: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: receptionistInstructions,
      },
      createCurrentDateContext(),
      ...(knownUserContext ? [knownUserContext] : []),
      ...messages,
    ];

    for (let round = 0; round < maxToolRounds; round += 1) {
      const response = await client.chat.completions.create({
        model: getModel(),
        messages: conversationMemory,
        tools: [...eventLookupTools, ...bookingTools],
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
            bookingStatus,
            chatId: toolContext.chatId,
            lastIntent,
            messages,
            reply,
            userId: toolContext.userId,
          });
        } catch {
          // Session logging is best-effort so chat replies still return.
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

        const result =
          toolCall.function.name === "list_events_in_range"
            ? await executeEventTool(toolCall)
            : await executeBookingTool(toolCall, toolContext);

        if (result.intent) {
          lastIntent = result.intent;
        }

        if (typeof result.bookingStatus === "string") {
          bookingStatus = result.bookingStatus;
        }

        if (toolContext.userId && result.userProfile) {
          await upsertUserProfile({
            userId: toolContext.userId,
            lastChatSessionId: toolContext.chatId,
            ...result.userProfile,
          });
        }

        conversationMemory.push({
          role: "tool",
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        });
      }
    }

    const reply =
      "I need a moment to finish that. Please call the studio so a team member can help.";

    try {
      await persistConversation({
        bookingStatus,
        chatId: toolContext.chatId,
        lastIntent,
        messages,
        reply,
        userId: toolContext.userId,
      });
    } catch {
      // Session logging is best-effort so chat replies still return.
    }

    return Response.json({ reply });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "The receptionist could not reply.",
      },
      { status: 500 },
    );
  }
}
