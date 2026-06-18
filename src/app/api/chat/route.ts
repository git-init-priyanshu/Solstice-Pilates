import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

import { calendarTools } from "@/lib/tools/calendar";
import { createSheetClient } from "@/hooks/useSheet";
import type { OpenAIChatMessage } from "@/types/openai.types";

import { maxToolRounds, llmInstructions } from "@/lib/chat/chatConstants";
import {
  createOpenAIClient,
  getLatestUserMessage,
  getModel,
  isValidMessage,
} from "@/lib/chat/chatHelpers";
import { executeCalendarTool } from "@/lib/tools/calendarToolExecutor";

type ChatRequestBody = {
  chatId?: string;
  messages?: OpenAIChatMessage[];
  userId?: string;
};

const { logConversationToSheet } = createSheetClient();

export async function POST(request: Request) {
  try {
    const body: ChatRequestBody = await request.json();
    const messages = Array.isArray(body.messages)
      ? body.messages.filter(isValidMessage)
      : [];

    if (messages.length === 0) {
      return Response.json(
        { message: "At least one chat message is required." },
        { status: 400 },
      );
    }

    const toolContext = {
      chatId: body.chatId || crypto.randomUUID(),
      userId: body.userId || undefined,
    };
    const client = createOpenAIClient();
    const toolsUsed: string[] = [];
    const conversationMemory: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: llmInstructions,
      },
      ...messages,
    ];

    for (let round = 0; round < maxToolRounds; round += 1) {
      const response = await client.chat.completions.create({
        model: getModel(),
        messages: conversationMemory,
        tools: calendarTools,
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
          await logConversationToSheet({
            assistantReply: reply,
            chatId: toolContext.chatId,
            intent: "chat",
            toolsUsed,
            userId: toolContext.userId,
            userMessage: getLatestUserMessage(messages),
          });
        } catch {
          // TODO: Logging is best-effort so a missing sheet setup does not block chat.
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
        if (toolCall.type === "function") {
          toolsUsed.push(toolCall.function.name);
        }

        const result = await executeCalendarTool(toolCall, toolContext);

        conversationMemory.push({
          role: "tool",
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        });
      }
    }

    return Response.json({
      reply:
        "I need a moment to finish that. Please call the studio so a team member can help.",
    });
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
