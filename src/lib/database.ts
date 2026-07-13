import type { Chat, Event, User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  EventRangeInput,
  EventRecord,
  EventRecordInput,
} from "@/types/event.types";
import type { ChatSessionRecord, UserProfile } from "@/types/session.types";
import type { ChatSessionInput, UserProfileInput } from "@/types/db.types";

function toUserProfile(user: User): UserProfile {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    bookingStatus: user.bookingStatus,
    bookedEventId: user.bookedEventId,
    lastChatSessionId: user.lastChatSessionId,
    createdAt: user.createdAt.toISOString(),
    role: user.role === "admin" ? "admin" : "user",
  };
}

function toChatSession(chat: Chat): ChatSessionRecord {
  return {
    id: chat.id,
    userId: chat.userId,
    conversation: chat.conversation,
    conversationSummary: chat.conversationSummary,
    lastIntent: chat.lastIntent,
    bookingStatus: chat.bookingStatus,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
  };
}

function toEventRecord(event: Event): EventRecord {
  return {
    eventId: event.id,
    name: event.name,
    startTime: event.startTime,
    endTime: event.endTime,
    pricingPerHour: event.pricingPerHour,
    capacity: event.capacity,
    bookedCustomers: event.bookedCustomers,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export function useDatabase() {
  async function findUserById(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user ? toUserProfile(user) : null;
  }

  async function findChatById(chatId: string) {
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    return chat ? toChatSession(chat) : null;
  }

  async function findEventById(eventId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    return event ? toEventRecord(event) : null;
  }

  async function findEventByName(eventName: string) {
    const event = await prisma.event.findFirst({
      where: { name: { equals: eventName.trim(), mode: "insensitive" } },
    });
    return event ? toEventRecord(event) : null;
  }

  async function getUserBookingDetails(userId: string) {
    const user = await findUserById(userId);

    if (!user) {
      return null;
    }

    const event = user.bookedEventId
      ? await findEventById(user.bookedEventId)
      : null;

    return {
      event,
      user,
    };
  }

  async function listEvents() {
    const events = await prisma.event.findMany();

    return events
      .map(toEventRecord)
      .sort(
        (left, right) =>
          Date.parse(left.startTime) - Date.parse(right.startTime),
      );
  }

  async function listHandoffChats() {
    const [users, chats] = await Promise.all([
      prisma.user.findMany({ where: { role: "user" } }),
      prisma.chat.findMany(),
    ]);
    const chatById = new Map(chats.map((chat) => [chat.id, chat]));

    return users
      .map((user) => {
        const chat = chatById.get(user.lastChatSessionId);
        const conversation = chat?.conversation || "";
        let messages: Array<{
          content: string;
          role: "assistant" | "user";
        }> = [];
        if (conversation) {
          try {
            messages = JSON.parse(conversation) as Array<{
              content: string;
              role: "assistant" | "user";
            }>;
          } catch {
            messages = [];
          }
        }

        if (
          !chat ||
          chat.userId !== user.id ||
          chat.lastIntent !== "human_handoff" ||
          !messages.some((message) => message.role === "user" && message.content)
        ) {
          return null;
        }

        return {
          chat: toChatSession(chat),
          user: toUserProfile(user),
        };
      })
      .filter((item) => item !== null)
      .sort(
        (left, right) =>
          Date.parse(right.chat.updatedAt) - Date.parse(left.chat.updatedAt),
      );
  }

  async function createEventRecord({
    eventId,
    name,
    startTime,
    endTime,
    pricingPerHour,
    capacity,
    bookedCustomers = 0,
  }: EventRecordInput): Promise<EventRecord> {
    if (endTime <= startTime) {
      throw new Error("endTime must be after startTime.");
    }

    if (bookedCustomers > capacity) {
      throw new Error("bookedCustomers cannot exceed capacity.");
    }

    const event = await prisma.event.create({
      data: {
        id: eventId ?? crypto.randomUUID(),
        name,
        startTime,
        endTime,
        pricingPerHour,
        capacity,
        bookedCustomers,
      },
    });

    return toEventRecord(event);
  }

  async function listEventsInRange({
    startTime,
    endTime,
  }: EventRangeInput): Promise<EventRecord[]> {
    const rangeStart = Date.parse(startTime);
    const rangeEnd = Date.parse(endTime);

    if (rangeEnd <= rangeStart) {
      throw new Error("endTime must be after startTime.");
    }

    const events = await listEvents();

    return events.filter(
      (event) =>
        Date.parse(event.startTime) < rangeEnd &&
        rangeStart < Date.parse(event.endTime),
    );
  }

  async function updateEventRecord(event: EventRecord) {
    const storedEvent = await prisma.event.findUnique({
      where: { id: event.eventId },
    });

    if (!storedEvent) {
      throw new Error("The event could not be found.");
    }

    if (event.endTime <= event.startTime) {
      throw new Error("endTime must be after startTime.");
    }

    if (event.bookedCustomers > event.capacity) {
      throw new Error("bookedCustomers cannot exceed capacity.");
    }

    const updatedEvent = await prisma.event.update({
      where: { id: event.eventId },
      data: {
        name: event.name,
        startTime: event.startTime,
        endTime: event.endTime,
        pricingPerHour: event.pricingPerHour,
        capacity: event.capacity,
        bookedCustomers: event.bookedCustomers,
      },
    });

    return toEventRecord(updatedEvent);
  }

  async function adjustEventBookedCustomers(eventId: string, change: number) {
    const event = await findEventById(eventId);

    if (!event) {
      throw new Error("The event could not be found.");
    }

    const nextBookedCustomers = Number(event.bookedCustomers) + change;

    if (nextBookedCustomers > Number(event.capacity)) {
      throw new Error("This event is already full.");
    }

    return updateEventRecord({
      ...event,
      bookedCustomers: nextBookedCustomers,
    });
  }

  async function createChatSession({
    chatId,
    userId,
    conversation = JSON.stringify([]),
    conversationSummary = "",
    lastIntent = "",
    bookingStatus = "",
  }: ChatSessionInput): Promise<ChatSessionRecord> {
    const chat = await prisma.chat.create({
      data: {
        id: chatId,
        userId,
        conversation,
        conversationSummary,
        lastIntent,
        bookingStatus,
      },
    });

    return toChatSession(chat);
  }

  async function createUserProfile({
    userId,
    bookedEventId = "",
    bookingStatus = "",
    lastChatSessionId,
    name = "",
    email = "",
    phone = "",
    role = "user",
  }: UserProfileInput): Promise<UserProfile> {
    const user = await prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        phone,
        lastChatSessionId: lastChatSessionId || "",
        bookingStatus,
        bookedEventId,
        role,
      },
    });

    return toUserProfile(user);
  }

  async function upsertUserProfile({
    userId,
    bookedEventId,
    bookingStatus,
    lastChatSessionId,
    name,
    email,
    phone,
    role,
  }: UserProfileInput) {
    const user = await findUserById(userId);

    const chatId =
      lastChatSessionId || user?.lastChatSessionId || crypto.randomUUID();
    const chat =
      (await findChatById(chatId)) ??
      (await createChatSession({
        chatId,
        userId,
      }));

    if (!user) {
      const createdUser = await createUserProfile({
        userId,
        lastChatSessionId: chat.id,
        name,
        email,
        phone,
        bookingStatus,
        bookedEventId,
        role,
      });

      return {
        chat,
        user: createdUser,
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name ? name : user.name,
        email: email ? email : user.email,
        phone: phone ? phone : user.phone,
        bookingStatus: bookingStatus ?? user.bookingStatus,
        bookedEventId: bookedEventId ?? user.bookedEventId,
        lastChatSessionId: chat.id,
        role: role ?? user.role,
      },
    });

    return {
      chat,
      user: toUserProfile(updatedUser),
    };
  }

  async function upsertChatSession({
    chatId,
    userId,
    conversation,
    conversationSummary,
    lastIntent,
    bookingStatus,
  }: ChatSessionInput) {
    const existingChat = await prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!existingChat) {
      return createChatSession({
        chatId,
        userId,
        conversation,
        conversationSummary,
        lastIntent,
        bookingStatus,
      });
    }

    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        userId: userId || existingChat.userId,
        conversation: conversation ?? existingChat.conversation,
        conversationSummary:
          conversationSummary ?? existingChat.conversationSummary,
        lastIntent: lastIntent ?? existingChat.lastIntent,
        bookingStatus: bookingStatus ?? existingChat.bookingStatus,
      },
    });

    return toChatSession(updatedChat);
  }

  return {
    adjustEventBookedCustomers,
    createEventRecord,
    findEventById,
    findEventByName,
    findChatById,
    findUserById,
    getUserBookingDetails,
    listHandoffChats,
    listEventsInRange,
    updateEventRecord,
    upsertChatSession,
    upsertUserProfile,
  };
}
