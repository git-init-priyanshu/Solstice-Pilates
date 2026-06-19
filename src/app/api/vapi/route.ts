import { useSheet as sheetApi } from "@/hooks/useSheet";
import { executeBookingTool } from "@/lib/tools/bookingToolExecutor";
import { executeEventTool } from "@/lib/tools/eventToolExecutor";
import type { OpenAIChatMessage } from "@/types/openai.types";
import type { VapiRoutePayload } from "@/types/vapi.types";

const { upsertChatSession, upsertUserProfile } = sheetApi();

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
    const payload = (await request.json()) as VapiRoutePayload;
    const message = payload.message;

    if (!message?.type) {
      return Response.json(
        {
          message: "Missing Vapi message type.",
        },
        { status: 400 },
      );
    }

    const variableValues = (message.artifact?.variableValues ?? {}) as Record<
      string,
      unknown
    >;
    const chatId = String(variableValues.chatId || crypto.randomUUID());
    const userId = String(variableValues.userId || "");
    const name = String(variableValues.name || "");
    const email = String(variableValues.email || "");
    const phone = String(variableValues.phone || "");

    // Execute tools
    if (message.type === "tool-calls") {
      const results = await Promise.all(
        (message.toolCallList ?? []).map(async (toolCall, index) => {
          const toolCallId = toolCall.id ? toolCall.id : `tool-call-${index}`;
          const toolName = String(
            toolCall.function?.name || toolCall.name || "",
          );

          if (!toolName) {
            return {
              error: "Tool call payload was invalid.",
              name: "unknown",
              toolCallId,
            };
          }

          let parameters: Record<string, unknown> = {};

          if (toolCall.parameters) {
            parameters = toolCall.parameters;
          } else if (typeof toolCall.function?.arguments === "string") {
            parameters = JSON.parse(toolCall.function.arguments);
          } else if (toolCall.function?.arguments) {
            parameters = toolCall.function.arguments;
          }

          const assistantToolCall = {
            id: toolCallId,
            type: "function" as const,
            function: {
              arguments: JSON.stringify(parameters),
              name: toolName,
            },
          };
          let result;

          if (toolName === "list_events_in_range") {
            result = await executeEventTool(assistantToolCall);
          } else if (toolName === "request_human_handoff") {
            result = {
              ok: true,
              message: "request_human_handoff completed",
              data: {
                reason:
                  typeof parameters.reason === "string" ? parameters.reason : "",
              },
              intent: "human_handoff",
            };
          } else {
            result = await executeBookingTool(assistantToolCall, {
              chatId,
              userId,
            });
          }

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
            userId,
          });

          if (!result.ok) {
            return {
              error: result.message,
              name: toolName,
              toolCallId,
            };
          }

          return {
            name: toolName,
            result: JSON.stringify(result),
            toolCallId,
          };
        }),
      );

      return Response.json({ results });
    }

    // Persist the latest voice conversation snapshot and final transcript in Sheets.
    if (
      message.type === "conversation-update" ||
      message.type === "end-of-call-report"
    ) {
      const messages = (
        message.messagesOpenAIFormatted ??
        message.artifact?.messagesOpenAIFormatted ??
        []
      )
        .filter(
          (entry) => entry.role === "user" || entry.role === "assistant",
        )
        .map<OpenAIChatMessage>((entry) => ({
          role: entry.role as OpenAIChatMessage["role"],
          content: String(entry.content || ""),
        }));

      if (userId) {
        await upsertUserProfile({
          userId,
          lastChatSessionId: chatId,
          name,
          email,
          phone,
          role: "user",
        });
      }
      await upsertChatSession({
        chatId,
        conversation: JSON.stringify(messages),
        conversationSummary: message.artifact?.transcript,
        userId,
      });
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
