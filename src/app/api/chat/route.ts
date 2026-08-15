import { useDatabase as sheetApi } from "@/lib/database";
import { runAgentLoop } from "@/lib/chat/agentLoop";
import { assistantInstructions } from "@/lib/chat/chatConstants";
import { shouldTriggerHandoff, wantsAssistantBack } from "@/lib/chat/handoff";
import {
  createKnownUserContext,
  createOpenAIClient,
} from "@/lib/chat/chatHelpers";
import type { ChatRequestBody } from "@/types/chat.types";

const { findChatById, upsertChatSession, upsertUserProfile } = sheetApi();

const fallbackReply =
  "Sorry, I couldn't complete that just now. Could you rephrase or try again?";

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

      return Response.json({ reply, chatId: toolContext.chatId, handoff: true });
    }

    const knownUserContext = createKnownUserContext(body.userProfile);
    const {
      reply,
      lastIntent,
      bookingStatus,
      conversationSummary,
      userProfileUpdates,
    } = await runAgentLoop({
      client: createOpenAIClient(),
      instructions: assistantInstructions,
      scope: "client",
      messages,
      contextMessages: knownUserContext ? [knownUserContext] : [],
      toolContext,
      initialIntent: "chat",
      fallbackReply,
    });

    if (toolContext.userId && userProfileUpdates) {
      await upsertUserProfile({
        userId: toolContext.userId,
        lastChatSessionId: toolContext.chatId,
        ...userProfileUpdates,
      });
    }

    // `messages` is the client-supplied history. During a handoff the client
    // polls and re-sends the admin's assistant replies, so persisting
    // `[...messages, reply]` here preserves those prior handoff turns after a
    // resume; the new assistant reply is always appended last.
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

    return Response.json({
      reply,
      chatId: toolContext.chatId,
      handoff: lastIntent === "human_handoff",
    });
  } catch {
    return Response.json(
      {
        message: "The assistant could not reply.",
      },
      { status: 500 },
    );
  }
}
