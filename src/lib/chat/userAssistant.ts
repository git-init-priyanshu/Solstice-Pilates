import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ChatCompletionMessageFunctionToolCall } from "openai/resources.js";

import { createSheetApi } from "@/hooks/useSheet";
import { assistantInstructions, maxToolRounds } from "@/lib/chat/chatConstants";
import {
  createCurrentDateContext,
  createKnownUserContext,
  createOpenAIClient,
} from "@/lib/chat/chatHelpers";
import { bookingTools } from "@/lib/tools/booking";
import { eventLookupTools } from "@/lib/tools/event";
import { executeBookingTool } from "@/lib/tools/bookingToolExecutor";
import { executeEventTool } from "@/lib/tools/eventToolExecutor";
import type { ChatRequestBody } from "@/types/chat.types";
import type { OpenAIChatMessage } from "@/types/openai.types";
import type { UserProfile } from "@/types/session.types";
import type { ToolResult } from "@/types/tools.types";

const { upsertChatSession, upsertUserProfile } = createSheetApi();

const handoffPattern =
  /(refund|billing|charged|charge|wrong price|price issue|price complaint|complaint|complain|manager|human|admin|birthday|party|private event|celebration)/;

export const userAssistantTools = [...eventLookupTools, ...bookingTools];

type UserAssistantToolInput = {
  chatId: string;
  parameters: Record<string, unknown>;
  toolCallId: string;
  toolName: string;
  userId?: string;
};

type PersistUserConversationInput = {
  bookingStatus?: string;
  chatId: string;
  conversationSummary?: string;
  lastIntent?: string;
  messages: OpenAIChatMessage[];
  userId?: string;
  userProfile?: Pick<UserProfile, "email" | "name" | "phone">;
};

function shouldStartHandoff(
  messages: OpenAIChatMessage[],
  lastIntent?: string,
) {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  return (
    lastIntent === "human_handoff" ||
    handoffPattern.test(latestUserMessage?.content.toLowerCase() || "")
  );
}

function createToolCall({
  parameters,
  toolCallId,
  toolName,
}: Omit<UserAssistantToolInput, "chatId" | "userId">): ChatCompletionMessageFunctionToolCall {
  return {
    id: toolCallId,
    type: "function",
    function: {
      arguments: JSON.stringify(parameters),
      name: toolName,
    },
  };
}

function filterConversationMessages(messages: OpenAIChatMessage[]) {
  return messages.filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string",
  );
}

async function syncUserProfile({
  chatId,
  userId,
  userProfile,
}: Pick<PersistUserConversationInput, "chatId" | "userId" | "userProfile">) {
  if (!userId) {
    return null;
  }

  return upsertUserProfile({
    userId,
    lastChatSessionId: chatId,
    name: userProfile?.name,
    email: userProfile?.email,
    phone: userProfile?.phone,
    role: "user",
  });
}

export async function persistUserConversation({
  bookingStatus,
  chatId,
  conversationSummary,
  lastIntent,
  messages,
  userId,
  userProfile,
}: PersistUserConversationInput) {
  await syncUserProfile({
    chatId,
    userId,
    userProfile,
  });

  return upsertChatSession({
    bookingStatus,
    chatId,
    conversation: JSON.stringify(filterConversationMessages(messages)),
    conversationSummary,
    lastIntent,
    userId: userId || "",
  });
}

export async function executeUserAssistantTool({
  chatId,
  parameters,
  toolCallId,
  toolName,
  userId,
}: UserAssistantToolInput): Promise<ToolResult> {
  const toolCall = createToolCall({
    parameters,
    toolCallId,
    toolName,
  });

  const result =
    toolName === "list_events_in_range"
      ? await executeEventTool(toolCall)
      : toolName === "request_human_handoff"
        ? {
            ok: true,
            message: "request_human_handoff completed",
            data: {
              reason:
                typeof parameters.reason === "string" ? parameters.reason : "",
            },
            intent: "human_handoff",
          }
        : await executeBookingTool(toolCall, { chatId, userId });

  if (userId && result.userProfile) {
    await upsertUserProfile({
      userId,
      lastChatSessionId: chatId,
      ...result.userProfile,
    });
  }

  await upsertChatSession({
    bookingStatus: result.bookingStatus,
    chatId,
    lastIntent: result.intent,
    userId: userId || "",
  });

  return result;
}

export async function runUserAssistant(body: ChatRequestBody) {
  const messages = filterConversationMessages(
    body.messages?.filter(
      (message) => message.role === "user" || message.role === "assistant",
    ) ?? [],
  );
  const chatId = body.chatId ?? crypto.randomUUID();
  const userId = body.userId;

  const session = await syncUserProfile({
    chatId,
    userId,
    userProfile: body.userProfile,
  });
  const isExistingHandoff = shouldStartHandoff(
    messages,
    session?.chat.lastIntent,
  );

  if (isExistingHandoff) {
    const reply =
      session?.chat.lastIntent === "human_handoff"
        ? null
        : "I've shared this with the studio admin. They will reply here soon.";

    await persistUserConversation({
      bookingStatus: session?.user.bookingStatus ?? "",
      chatId,
      lastIntent: "human_handoff",
      messages: reply
        ? [
            ...messages,
            {
              role: "assistant",
              content: reply,
            },
          ]
        : messages,
      userId,
      userProfile: body.userProfile,
    });

    return { reply };
  }

  const openAiClient = createOpenAIClient();
  let bookingStatus = session?.user.bookingStatus ?? "";
  let lastIntent = "chat";
  const knownUserContext = createKnownUserContext(body.userProfile);
  const conversationMemory: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: assistantInstructions,
    },
    createCurrentDateContext(),
    ...(knownUserContext ? [knownUserContext] : []),
    ...messages,
  ];

  for (let round = 0; round < maxToolRounds; round += 1) {
    const response = await openAiClient.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: conversationMemory,
      tools: userAssistantTools,
      tool_choice: "auto",
    });
    const llmMessage = response.choices[0]?.message;

    if (!llmMessage) {
      break;
    }

    const toolCalls = llmMessage.tool_calls ?? [];

    if (!toolCalls.length) {
      const reply = llmMessage.content || "";

      await persistUserConversation({
        bookingStatus,
        chatId,
        lastIntent,
        messages: [
          ...messages,
          {
            role: "assistant",
            content: reply,
          },
        ],
        userId,
        userProfile: body.userProfile,
      });

      return { reply: reply || null };
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

      const result = await executeUserAssistantTool({
        chatId,
        parameters: JSON.parse(toolCall.function.arguments || "{}") as Record<
          string,
          unknown
        >,
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        userId,
      });

      if (result.intent) {
        lastIntent = result.intent;
      }

      if (result.bookingStatus) {
        bookingStatus = result.bookingStatus;
      }

      conversationMemory.push({
        role: "tool",
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      });
    }
  }

  throw new Error("The assistant is taking too long to process the request.");
}
