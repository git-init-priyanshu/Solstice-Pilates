import { createSheetClient } from "@/hooks/useSheet";
import type { UserProfile } from "@/types/session.types";

type SessionUpdateBody = {
  chatId?: string;
  userId?: string;
  userProfile?: Pick<UserProfile, "email" | "name" | "phone">;
};

const { getOrCreateChatSession, upsertUserProfile } = createSheetClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim();

    if (!userId) {
      return Response.json({ message: "userId is required." }, { status: 400 });
    }

    const session = await getOrCreateChatSession(userId);

    return Response.json(session);
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load the chat session.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body: SessionUpdateBody = await request.json();
    const userId = body.userId?.trim();

    if (!userId) {
      return Response.json({ message: "userId is required." }, { status: 400 });
    }

    const session = await upsertUserProfile({
      userId,
      lastChatSessionId: body.chatId,
      name: body.userProfile?.name?.trim(),
      email: body.userProfile?.email?.trim(),
      phone: body.userProfile?.phone?.trim(),
    });

    return Response.json({
      chat: session.chat,
      messages: [],
      user: session.user,
    });
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to update the user profile.",
      },
      { status: 500 },
    );
  }
}
