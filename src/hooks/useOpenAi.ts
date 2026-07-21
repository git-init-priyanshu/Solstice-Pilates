import type { LLMReplyInput, LLMReplyResult } from "@/types/chat.types";

export function useOpenAi() {
  async function getLLMReply({
    apiPath,
    chatId,
    messages,
    userId,
    userProfile,
  }: LLMReplyInput): Promise<LLMReplyResult> {
    const response = await fetch(apiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chatId, messages, userId, userProfile }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Unable to reach the assistant.");
    }

    return {
      reply: payload.reply ?? null,
      chatId: payload.chatId,
      handoff: payload.handoff === true,
    };
  }

  return {
    getLLMReply,
  };
}
