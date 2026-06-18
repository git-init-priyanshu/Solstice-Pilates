import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { bookingTools } from "@/lib/tools/booking";
import { eventLookupTools } from "@/lib/tools/event";
import { useSheet } from "@/hooks/useSheet";
import type { ChatRequestBody } from "@/types/chat.types";

import { maxToolRounds, assistantInstructions } from "@/lib/chat/chatConstants";
import {
  createCurrentDateContext,
  createKnownUserContext,
  createOpenAIClient,
} from "@/lib/chat/chatHelpers";
import { executeBookingTool } from "@/lib/tools/bookingToolExecutor";
import { executeEventTool } from "@/lib/tools/eventToolExecutor";

const { upsertChatSession, upsertUserProfile } = useSheet();

export async function POST(request: Request) {
  try {
    const body: ChatRequestBody = await request.json();
    const messages = body.messages?.filter(
      (message) => message.role === "user" || message.role === "assistant",
    ) ?? [];

    const toolContext = {
      chatId: body.chatId ?? crypto.randomUUID(),
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

    const openAiClient = createOpenAIClient();
    let bookingStatus = "";
    let lastIntent = "chat";
    const knownUserContext = createKnownUserContext(body.userProfile);
    const conversationMemory: ChatCompletionMessageParam[] = [
      // System prompt
      {
        role: "system",
        content: assistantInstructions,
      },
      // Date context
      createCurrentDateContext(),
      // User context
      ...(knownUserContext ? [knownUserContext] : []),
      ...messages,
    ];

    for (let round = 0; round < maxToolRounds; round += 1) {
      const response = await openAiClient.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: conversationMemory,
        tools: [...eventLookupTools, ...bookingTools],
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
          bookingStatus,
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

        return Response.json({ reply });
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

        const result =
          toolCall.function.name === "list_events_in_range"
            ? await executeEventTool(toolCall)
            : await executeBookingTool(toolCall, toolContext);

        lastIntent = result.intent ?? "";
        bookingStatus = result.bookingStatus ?? "";

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

    return Response.json(
      {
        message: "The assistant is taking too long to process the request.",
      },
      { status: 500 },
    );
  } catch (error) {
    return Response.json(
      {
        message: "The assistant could not reply.",
      },
      { status: 500 },
    );
  }
}
