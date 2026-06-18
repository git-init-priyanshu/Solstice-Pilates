import type { LLMReplyInput } from "@/types/chat.types";

export function useOpenAi() {
  async function getLLMReply({
    apiPath,
    chatId,
    messages,
    userId,
    userProfile,
  }: LLMReplyInput) {
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

    return (
      payload.reply ||
      "I can help with that. Could you share a little more detail?"
    );
  }

  return {
    getLLMReply,
  };
}
