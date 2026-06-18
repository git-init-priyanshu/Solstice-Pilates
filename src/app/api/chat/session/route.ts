import { useSheet } from "@/hooks/useSheet";
import type { OpenAIChatMessage } from "@/types/openai.types";

const { upsertUserProfile } = useSheet();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ message: "userId is required." }, { status: 400 });
    }

    const { chat, user } = await upsertUserProfile({ userId });

    return Response.json({
      user,
      chat,
      messages: chat.conversation
        ? (JSON.parse(chat.conversation) as OpenAIChatMessage[])
        : [],
    });
  } catch {
    return Response.json(
      {
        message: "Unable to load the chat session.",
      },
      { status: 500 },
    );
  }
}
