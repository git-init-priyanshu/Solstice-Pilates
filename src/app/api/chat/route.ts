import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { useDatabase as sheetApi } from "@/lib/database";
import { assistantInstructions, maxToolRounds } from "@/lib/chat/chatConstants";
import {
  chatModel,
  createCurrentDateContext,
  createKnownUserContext,
  createOpenAIClient,
} from "@/lib/chat/chatHelpers";
import { bookingTools } from "@/lib/tools/booking";
import { eventLookupTools } from "@/lib/tools/event";
import { executeBookingTool } from "@/lib/tools/bookingToolExecutor";
import { executeEventTool } from "@/lib/tools/eventToolExecutor";
import type { ChatRequestBody } from "@/types/chat.types";

const { upsertChatSession, upsertUserProfile } = sheetApi();

export async function POST(request: Request) {
  try {
    const body: ChatRequestBody = await request.json();
    const clientMessages = body.messages?.filter(
      (message) => message.role === "user" || message.role === "assistant",
    ) ?? [];

    const toolContext = {
      chatId: body.chatId ?? crypto.randomUUID(),
      userId: body.userId,
    };

    const session = body.userId
      ? await upsertUserProfile({
          userId: body.userId,
          lastChatSessionId: toolContext.chatId,
          name: body.userProfile?.name,
          email: body.userProfile?.email,
          phone: body.userProfile?.phone,
          role: "user",
        })
      : null;

    const messages = clientMessages;

    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    const isExistingHandoff = session?.chat.lastIntent === "human_handoff";
    const shouldHandoff =
      isExistingHandoff ||
      /(refund|billing|charged|charge|wrong price|price issue|price complaint|complaint|complain|manager|human|admin|birthday|party|private event|celebration)/.test(
        latestUserMessage?.content.toLowerCase() || "",
      );

    if (shouldHandoff) {
      const reply = isExistingHandoff
        ? null
        : "I've shared this with the studio admin. They will reply here soon.";

      await upsertChatSession({
        bookingStatus: session?.chat.bookingStatus ?? "",
        chatId: toolContext.chatId,
        conversation: JSON.stringify(
          reply
            ? [
                ...messages,
                {
                  role: "assistant",
                  content: reply,
                },
              ]
            : messages,
        ),
        lastIntent: "human_handoff",
        userId: toolContext.userId || "",
      });

      return Response.json({ reply });
    }

    const openAiClient = createOpenAIClient();
    let bookingStatus = "";
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
        model: chatModel,
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
  } catch {
    return Response.json(
      {
        message: "The assistant could not reply.",
      },
      { status: 500 },
    );
  }
}
