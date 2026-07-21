import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { useDatabase as sheetApi } from "@/lib/database";
import { assistantInstructions, maxToolRounds } from "@/lib/chat/chatConstants";
import { shouldTriggerHandoff, wantsAssistantBack } from "@/lib/chat/handoff";
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

const { findChatById, upsertChatSession, upsertUserProfile } = sheetApi();

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

    if (body.chatId) {
      const existingChat = await findChatById(body.chatId);

      if (
        existingChat &&
        existingChat.userId &&
        existingChat.userId !== body.userId
      ) {
        toolContext.chatId = crypto.randomUUID();
      }
    }

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
    const storedChat = await findChatById(toolContext.chatId);
    const inHandoff =
      session?.chat.lastIntent === "human_handoff" ||
      storedChat?.lastIntent === "human_handoff";
    const latestUserContent =
      typeof latestUserMessage?.content === "string"
        ? latestUserMessage.content
        : "";
    const resumeAssistant = inHandoff && wantsAssistantBack(latestUserContent);
    const isExistingHandoff = inHandoff && !resumeAssistant;
    const shouldHandoff =
      isExistingHandoff || shouldTriggerHandoff(latestUserContent);

    if (resumeAssistant) {
      await upsertChatSession({
        bookingStatus: session?.chat.bookingStatus ?? "",
        chatId: toolContext.chatId,
        conversation: storedChat?.conversation ?? "[]",
        lastIntent: "chat",
        userId: toolContext.userId || "",
      });
    }

    if (shouldHandoff) {
      const reply = isExistingHandoff
        ? null
        : "I've shared this with the studio admin. They will reply here soon.";

      let storedMessages: Array<{ role: string; content: string }> = [];
      try {
        storedMessages = storedChat?.conversation
          ? JSON.parse(storedChat.conversation)
          : [];
      } catch {
        storedMessages = [];
      }
      if (!Array.isArray(storedMessages)) {
        storedMessages = [];
      }

      const conversation = [...storedMessages];
      const lastStored = conversation[conversation.length - 1];

      if (
        latestUserMessage &&
        !(
          lastStored &&
          lastStored.role === latestUserMessage.role &&
          lastStored.content === latestUserMessage.content
        )
      ) {
        conversation.push(latestUserMessage);
      }

      if (reply) {
        conversation.push({ role: "assistant", content: reply });
      }

      await upsertChatSession({
        bookingStatus: session?.chat.bookingStatus ?? "",
        chatId: toolContext.chatId,
        conversation: JSON.stringify(conversation),
        lastIntent: "human_handoff",
        userId: toolContext.userId || "",
      });

      return Response.json({ reply, chatId: toolContext.chatId });
    }

    const openAiClient = createOpenAIClient();
    let bookingStatus: string | undefined;
    let lastIntent = "chat";
    let conversationSummary: string | undefined;
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
          ...(conversationSummary ? { conversationSummary } : {}),
          lastIntent,
          userId: toolContext.userId || "",
        });

        return Response.json({ reply, chatId: toolContext.chatId });
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

        if (
          result.intent === "human_handoff" &&
          typeof result.data === "object" &&
          result.data &&
          "reason" in result.data &&
          typeof result.data.reason === "string" &&
          result.data.reason
        ) {
          conversationSummary = `Handoff reason: ${result.data.reason}`;
        }

        if (result.bookingStatus) {
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
