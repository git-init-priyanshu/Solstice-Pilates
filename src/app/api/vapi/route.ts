import { useDatabase as sheetApi } from "@/lib/database";
import { executeBookingTool } from "@/lib/tools/bookingToolExecutor";
import { executeEventTool } from "@/lib/tools/eventToolExecutor";
import type { OpenAIChatMessage } from "@/types/openai.types";
import type { VapiRoutePayload } from "@/types/vapi.types";

const { findChatById, upsertChatSession, upsertUserProfile } = sheetApi();

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
    let chatId = String(variableValues.chatId || crypto.randomUUID());
    const userId = String(variableValues.userId || "");
    const name = String(variableValues.name || "");
    const email = String(variableValues.email || "");
    const phone = String(variableValues.phone || "");

    if (variableValues.chatId) {
      const existingChat = await findChatById(chatId);

      if (
        existingChat &&
        existingChat.userId &&
        existingChat.userId !== userId
      ) {
        chatId = crypto.randomUUID();
      }
    }

    // Execute tools
    if (message.type === "tool-calls") {
      const results = await Promise.all(
        (message.toolCallList ?? []).map(async (toolCall) => {
          const toolCallId = toolCall.id || "";

          try {
            const toolName = String(
              toolCall.function?.name || toolCall.name || "",
            );

            if (!toolCallId || !toolName) {
              return {
                result: "Tool call payload was invalid.",
                toolCallId,
              };
            }

            let parameters: Record<string, unknown> = {};

            if (toolCall.parameters) {
              parameters = toolCall.parameters;
            } else if (typeof toolCall.arguments === "string") {
              parameters = JSON.parse(toolCall.arguments);
            } else if (toolCall.arguments) {
              parameters = toolCall.arguments;
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

            const result =
              toolName === "list_events_in_range"
                ? await executeEventTool(assistantToolCall)
                : toolName === "request_human_handoff"
                  ? {
                      ok: true,
                      message: "request_human_handoff completed",
                      data: {
                        reason:
                          typeof parameters.reason === "string"
                            ? parameters.reason
                            : "",
                      },
                      intent: "human_handoff",
                    }
                  : await executeBookingTool(assistantToolCall, {
                      chatId,
                      userId,
                    });

            if (!result.ok) {
              return {
                result: result.message.replace(/\s+/g, " ").trim(),
                toolCallId,
              };
            }

            const summary =
              typeof result.data === "object" &&
              result.data &&
              "summary" in result.data &&
              typeof result.data.summary === "string"
                ? result.data.summary
                : result.message;

            try {
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
            } catch (error) {
              console.error("Unable to persist Vapi tool result.", error);
            }

            return {
              result: (summary || result.message).replace(/\s+/g, " ").trim(),
              toolCallId,
            };
          } catch (error) {
            console.error("Unable to execute Vapi tool call.", error);

            return {
              result: "Tool execution failed.",
              toolCallId,
            };
          }
        }),
      );

      return Response.json({ results }, { status: 200 });
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
          content: Array.isArray(entry.content)
            ? entry.content
                .filter((part) => part?.type === "text")
                .map((part) => part.text)
                .join("")
            : typeof entry.content === "string"
              ? entry.content
              : "",
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
        ...(messages.length ? { conversation: JSON.stringify(messages) } : {}),
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
