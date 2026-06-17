import type { OpenAIChatMessage } from "@/types/openai.types";

type LLMReplyInput = {
  chatId: string;
  messages: OpenAIChatMessage[];
  userId: string;
};

export function useOpenAi() {
  async function getLLMReply({ chatId, messages, userId }: LLMReplyInput) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chatId, messages, userId }),
    });

    const payload = (await response.json()) as {
      reply?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message || "Unable to reach the receptionist.");
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
