import type { LLMReplyInput } from "@/types/chat.types";

export function useOpenAi() {
  async function getLLMReply({
    apiPath,
    chatId,
    messages,
    role,
    userId,
    userProfile,
  }: LLMReplyInput) {
    const adminSecret = process.env.NEXT_PUBLIC_ADMIN_API_SECRET;
    const response = await fetch(apiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(role === "admin" && adminSecret
          ? { Authorization: `Bearer ${adminSecret}` }
          : {}),
      },
      body: JSON.stringify({ chatId, messages, userId, userProfile }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Unable to reach the assistant.");
    }

    return payload.reply ?? null;
  }

  return {
    getLLMReply,
  };
}
