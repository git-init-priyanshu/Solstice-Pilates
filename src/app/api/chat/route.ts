import OpenAI from "openai";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

import { executeWorkspaceTool } from "@/lib/tools/executeWorkspaceTool";
import { workspaceAgentTools } from "@/lib/tools/workspaceAgentTools";
import type { OpenAIChatMessage } from "@/types/openai.types";

export const runtime = "nodejs";

type ChatRequestBody = {
  chatId?: string;
  messages?: OpenAIChatMessage[];
  userId?: string;
};

const maxToolRounds = 5;

const llmInstructions = `
You are the AI receptionist for Solstice Pilates, a small pilates studio.
Keep replies short, calm, and human-like.

For every message:
- Understand the client intent.
- Ask for missing details before taking action.
- Use Google Calendar tools when availability, booking, rescheduling, or cancellation is needed.
- Confirm with the client before booking or rescheduling.
- Update or log Google Sheets when an interaction, call request, booking, cancellation, or handoff happens.
- Reply naturally after tools complete.

Guardrails:
- Never book or reschedule without the client's name and phone number.
- Never claim a time is available without checking Calendar.
- Never claim a booking is complete unless the Calendar tool succeeds.
- Always log calls and important interactions in Sheets.
- Hand off billing complaints, refund disputes, angry callers, safety concerns, or complex account issues to a human.
- Do not ask for payment details.
`;

function createOpenAIClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Add OPENROUTER_API_KEY to use the receptionist.");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      ...(process.env.APP_URL ? { "HTTP-Referer": process.env.APP_URL } : {}),
      "X-OpenRouter-Title": "Solstice Pilates",
    },
  });
}

function getModel() {
  return process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
}

function getLatestUserMessage(messages: OpenAIChatMessage[]) {
  return (
    [...messages].reverse().find((message) => message.role === "user")
      ?.content || ""
  );
}

function isValidMessage(message: unknown): message is OpenAIChatMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Record<string, unknown>;

  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string"
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

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
      chatId: isNonEmptyString(body.chatId) ? body.chatId : crypto.randomUUID(),
      userId: isNonEmptyString(body.userId) ? body.userId : undefined,
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
        tools: workspaceAgentTools,
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
          await executeWorkspaceTool(
            {
              id: "conversation-log",
              type: "function",
              function: {
                name: "log_call_to_sheet",
                arguments: JSON.stringify({
                  intent: "chat",
                  status:
                    toolsUsed.length > 0
                      ? `tools: ${toolsUsed.join(", ")}`
                      : "answered",
                  notes: `User: ${getLatestUserMessage(messages)}\nAssistant: ${reply}`,
                }),
              },
            },
            toolContext,
          );
        } catch {
          // TODO: Logging is best-effort so a missing sheet setup does not block chat.
        }

        return Response.json({ reply });
      }

      // Log LLM replies in conversation
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

        const result = await executeWorkspaceTool(toolCall, toolContext);

        // Log tool calls in conversation
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
