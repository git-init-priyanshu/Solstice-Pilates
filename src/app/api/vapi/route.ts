import {
  executeUserAssistantTool,
  persistUserConversation,
} from "@/lib/chat/userAssistant";
import type { OpenAIChatMessage } from "@/types/openai.types";
import type {
  VapiToolCall,
  VapiWebhookMessage,
  VapiWebhookPayload,
} from "@/types/vapi.types";

function getVariableValues(message: VapiWebhookMessage) {
  return message.artifact?.variableValues ?? {};
}

function getStringValue(
  values: Record<string, unknown>,
  key: "chatId" | "email" | "name" | "phone" | "userId",
) {
  const value = values[key];

  return typeof value === "string" ? value : "";
}

function getChatId(message: VapiWebhookMessage) {
  const chatId = getStringValue(getVariableValues(message), "chatId");

  return chatId || message.call?.id || crypto.randomUUID();
}

function normalizeConversation(
  messages: VapiWebhookMessage["messagesOpenAIFormatted"],
): OpenAIChatMessage[] {
  return (messages ?? []).flatMap((message) => {
    if (
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string"
    ) {
      return [];
    }

    return [
      {
        role: message.role,
        content: message.content,
      },
    ];
  });
}

function normalizeToolCall(toolCall: VapiToolCall, index: number) {
  const toolCallId =
    typeof toolCall.id === "string" && toolCall.id
      ? toolCall.id
      : `tool-call-${index}`;
  const toolName =
    typeof toolCall.name === "string" && toolCall.name
      ? toolCall.name
      : typeof toolCall.function?.name === "string"
        ? toolCall.function.name
        : "";

  if (!toolName) {
    return null;
  }

  if (toolCall.parameters && typeof toolCall.parameters === "object") {
    return {
      parameters: toolCall.parameters,
      toolCallId,
      toolName,
    };
  }

  if (toolCall.function?.arguments && typeof toolCall.function.arguments === "object") {
    return {
      parameters: toolCall.function.arguments,
      toolCallId,
      toolName,
    };
  }

  if (typeof toolCall.function?.arguments === "string") {
    try {
      return {
        parameters: JSON.parse(toolCall.function.arguments) as Record<
          string,
          unknown
        >,
        toolCallId,
        toolName,
      };
    } catch {
      return null;
    }
  }

  return {
    parameters: {},
    toolCallId,
    toolName,
  };
}

async function handleToolCalls(message: VapiWebhookMessage) {
  const values = getVariableValues(message);
  const chatId = getChatId(message);
  const userId = getStringValue(values, "userId");
  const results = await Promise.all(
    (message.toolCallList ?? []).map(async (toolCall, index) => {
      const normalizedToolCall = normalizeToolCall(toolCall, index);

      if (!normalizedToolCall) {
        return {
          error: "Tool call payload was invalid.",
          name: "unknown",
          toolCallId:
            typeof toolCall.id === "string" && toolCall.id
              ? toolCall.id
              : `tool-call-${index}`,
        };
      }

      const result = await executeUserAssistantTool({
        chatId,
        parameters: normalizedToolCall.parameters,
        toolCallId: normalizedToolCall.toolCallId,
        toolName: normalizedToolCall.toolName,
        userId,
      });

      return result.ok
        ? {
            name: normalizedToolCall.toolName,
            result: JSON.stringify(result),
            toolCallId: normalizedToolCall.toolCallId,
          }
        : {
            error: result.message,
            name: normalizedToolCall.toolName,
            toolCallId: normalizedToolCall.toolCallId,
          };
    }),
  );

  return Response.json({ results });
}

async function handleConversationUpdate(message: VapiWebhookMessage) {
  const values = getVariableValues(message);

  await persistUserConversation({
    chatId: getChatId(message),
    conversationSummary: message.artifact?.transcript,
    messages: normalizeConversation(
      message.messagesOpenAIFormatted ?? message.artifact?.messagesOpenAIFormatted,
    ),
    userId: getStringValue(values, "userId"),
    userProfile: {
      email: getStringValue(values, "email"),
      name: getStringValue(values, "name"),
      phone: getStringValue(values, "phone"),
    },
  });
}

export async function POST(request: Request) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  const authorization = request.headers.get("authorization");
  const legacySecret = request.headers.get("x-vapi-secret");

  if (
    secret &&
    authorization !== `Bearer ${secret}` &&
    legacySecret !== secret
  ) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as VapiWebhookPayload;
    const message = payload.message;

    if (!message?.type) {
      return Response.json(
        {
          message: "Missing Vapi message type.",
        },
        { status: 400 },
      );
    }

    if (message.type === "tool-calls") {
      return handleToolCalls(message);
    }

    if (
      message.type === "conversation-update" ||
      message.type === "end-of-call-report"
    ) {
      await handleConversationUpdate(message);
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      {
        message: "Unable to process the Vapi webhook.",
      },
      { status: 500 },
    );
  }
}
