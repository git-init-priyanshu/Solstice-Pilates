import { useDatabase as sheetApi } from "@/lib/database";
import { executeBookingTool } from "@/lib/tools/bookingToolExecutor";
import { executeEventTool } from "@/lib/tools/eventToolExecutor";
import type { OpenAIChatMessage } from "@/types/openai.types";
import type { VapiRoutePayload } from "@/types/vapi.types";
import { resolveTranscriptSummary } from "@/lib/chat/vapiHelpers";

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
      const toolCalls = message.toolCallList ?? [];

      // Load the stored conversation once so a voice handoff merges into it
      // instead of overwriting an admin-visible history.
      const existingChat = await findChatById(chatId);
      let conversation: OpenAIChatMessage[] = [];

      if (existingChat?.conversation) {
        try {
          conversation = JSON.parse(existingChat.conversation) as OpenAIChatMessage[];
        } catch {
          conversation = [];
        }
      }

      const latestUserUtterance = String(
        [
          ...(message.artifact?.messagesOpenAIFormatted ??
            message.messagesOpenAIFormatted ??
            []),
        ]
          .reverse()
          .find((entry) => entry.role === "user")?.content || "",
      ).trim();

      // Tool calls that mutate the shared chat/session state must not race, so
      // run them sequentially and persist a single consolidated chat write.
      const results: Array<{ result: string; toolCallId: string }> = [];
      let conversationChanged = false;
      let lastIntent: string | undefined;
      let bookingStatus: string | undefined;
      let conversationSummary: string | undefined;
      let handoffTriggered = false;

      for (const toolCall of toolCalls) {
        const toolCallId = toolCall.id || "";

        try {
          const toolName = String(
            toolCall.function?.name || toolCall.name || "",
          );

          if (!toolCallId || !toolName) {
            results.push({
              result: "Tool call payload was invalid.",
              toolCallId,
            });
            continue;
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
            results.push({
              result: result.message.replace(/\s+/g, " ").trim(),
              toolCallId,
            });
            continue;
          }

          const summary =
            typeof result.data === "object" &&
            result.data &&
            "summary" in result.data &&
            typeof result.data.summary === "string"
              ? result.data.summary
              : result.message;

          if (userId && result.userProfile) {
            await upsertUserProfile({
              userId,
              lastChatSessionId: chatId,
              ...result.userProfile,
            });
          }

          if (result.bookingStatus !== undefined) {
            bookingStatus = result.bookingStatus;
          }
          if (result.intent !== undefined) {
            lastIntent = result.intent;
          }
          if (result.intent === "human_handoff") {
            handoffTriggered = true;
          }

          if (toolName === "request_human_handoff") {
            const reason =
              typeof result.data === "object" &&
              result.data &&
              "reason" in result.data &&
              typeof result.data.reason === "string"
                ? result.data.reason
                : "";

            if (reason) {
              conversationSummary = `Handoff reason: ${reason}`;
            }

            // Persist a user-role message so the voice handoff surfaces in the
            // admin handoff list (listHandoffChats requires a user message).
            const handoffContent =
              [reason, latestUserUtterance].filter(Boolean).join(" ").trim() ||
              "Caller requested a human handoff.";
            const alreadyPresent = conversation.some(
              (entry) =>
                entry.role === "user" && entry.content === handoffContent,
            );

            if (!alreadyPresent) {
              conversation.push({ role: "user", content: handoffContent });
              conversationChanged = true;
            }
          }

          results.push({
            result: (summary || result.message).replace(/\s+/g, " ").trim(),
            toolCallId,
          });
        } catch (error) {
          console.error("Unable to execute Vapi tool call.", error);

          results.push({
            result: "Tool execution failed.",
            toolCallId,
          });
        }
      }

      // A handoff must win over any later tool in the same batch, otherwise the
      // conversation drops out of listHandoffChats (needs lastIntent === "human_handoff").
      if (handoffTriggered) {
        lastIntent = "human_handoff";
      }

      // Keep voice bookings auditable: merge the caller's latest utterance even
      // when no handoff happened, so the admin view sees what was said.
      if (latestUserUtterance) {
        const alreadyPresent = conversation.some(
          (entry) =>
            entry.role === "user" && entry.content === latestUserUtterance,
        );

        if (!alreadyPresent) {
          conversation.push({ role: "user", content: latestUserUtterance });
          conversationChanged = true;
        }
      }

      try {
        await upsertChatSession({
          chatId,
          userId,
          ...(conversationChanged
            ? { conversation: JSON.stringify(conversation) }
            : {}),
          ...(conversationSummary ? { conversationSummary } : {}),
          ...(lastIntent !== undefined ? { lastIntent } : {}),
          ...(bookingStatus !== undefined ? { bookingStatus } : {}),
        });
      } catch (error) {
        console.error("Unable to persist Vapi tool result.", error);
      }

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
          content: String(entry.content || ""),
        }));

      // Merge with any stored conversation so an admin-visible handoff message
      // injected during a tool call is not wiped by the transcript snapshot.
      const existingChat = await findChatById(chatId);
      const merged = [...messages];

      if (existingChat?.conversation) {
        try {
          const stored = JSON.parse(
            existingChat.conversation,
          ) as OpenAIChatMessage[];

          for (const entry of stored) {
            const alreadyPresent = merged.some(
              (item) =>
                item.role === entry.role && item.content === entry.content,
            );

            if (!alreadyPresent) {
              merged.push(entry);
            }
          }
        } catch {
          // Ignore an unparseable stored conversation.
        }
      }

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
      const conversationSummary = resolveTranscriptSummary(
        existingChat?.conversationSummary,
        message.artifact?.transcript,
      );
      await upsertChatSession({
        chatId,
        ...(merged.length ? { conversation: JSON.stringify(merged) } : {}),
        ...(conversationSummary !== undefined ? { conversationSummary } : {}),
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
