import type { OpenAIChatMessage } from "@/types/openai.types";
import type { UserProfile } from "@/types/session.types";

type LLMReplyInput = {
  apiPath?: string;
  chatId: string;
  messages: OpenAIChatMessage[];
  userId: string;
  userProfile: Pick<UserProfile, "email" | "name" | "phone">;
};

export function useOpenAi() {
  async function getLLMReply({
    apiPath = "/api/chat",
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
