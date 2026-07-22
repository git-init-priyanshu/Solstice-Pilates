import { useDatabase as sheetApi } from "@/lib/database";
import { signUserId } from "@/lib/session/sessionToken";
import type { OpenAIChatMessage } from "@/types/openai.types";

const { upsertUserProfile } = sheetApi();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ message: "userId is required." }, { status: 400 });
    }

    const { chat, user } = await upsertUserProfile({ role: "user", userId });

    return Response.json(
      {
        user,
        chat,
        messages: chat.conversation
          ? (JSON.parse(chat.conversation) as OpenAIChatMessage[])
          : [],
      },
      {
        headers: {
          "Set-Cookie": `sp_session=${signUserId(userId)}; HttpOnly; SameSite=Lax; Path=/; Secure`,
        },
      },
    );
  } catch {
    return Response.json(
      {
        message: "Unable to load the chat session.",
      },
      { status: 500 },
    );
  }
}
