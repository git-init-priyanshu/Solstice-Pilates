import { getGoogleAccessToken } from "@/lib/googleApi";
import {
  appendSheetValues,
  getSheetValues,
  updateSheetValues,
} from "@/lib/sheetsApi";

import type {
  EventRangeInput,
  EventRecord,
  EventRecordInput,
} from "@/types/event.types";
import type { ChatSessionRecord, UserProfile } from "@/types/session.types";
import type {
  ChatSessionInput,
  SheetRecordRow,
  UserProfileInput,
} from "@/types/sheet.types";

const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || "";
const userSheetRange = "User!A:H";
const chatSheetRange = "Chat!A:H";
const eventSheetRange = "Event!A:I";

const userSheetHeaders = [
  "user_id",
  "name",
  "email",
  "phone",
  "last_chat_session_id",
  "created_at",
  "booking_status",
  "booked_event_id",
] as const;

const chatSheetHeaders = [
  "id",
  "user_id",
  "conversation",
  "conversation_summary",
  "last_intent",
  "booking_status",
  "created_at",
  "updated_at",
] as const;

const eventSheetHeaders = [
  "event_id",
  "name",
  "start_time",
  "end_time",
  "pricing_per_hour",
  "capacity",
  "booked_customers",
  "created_at",
  "updated_at",
] as const;

export function useSheet() {
  async function getRows(range: string, headers: readonly string[]) {
    const valuesResponse = await getSheetValues({
      accessToken: await getGoogleAccessToken(),
      spreadsheetId,
      range,
    });
    return (valuesResponse.values ?? [])
      .slice(1)
      .map<SheetRecordRow>((values, index) => ({
        rowNumber: index + 2,
        record: Object.fromEntries(
          headers.map((header, i) => [header, values[i] || ""]),
        ),
      }));
  }

  async function findUserById(userId: string) {
    const row = (await getRows(userSheetRange, userSheetHeaders)).find(
      (candidate) => candidate.record["user_id"] === userId,
    );
    if (!row) return null;

    return {
      userId: row.record["user_id"] || "",
      name: row.record["name"] || "",
      email: row.record["email"] || "",
      phone: row.record["phone"] || "",
      bookingStatus: row.record["booking_status"] || "",
      bookedEventId: row.record["booked_event_id"] || "",
      lastChatSessionId: row.record["last_chat_session_id"] || "",
      createdAt: row.record["created_at"] || "",
    };
  }

  async function findChatById(chatId: string) {
    const row = (await getRows(chatSheetRange, chatSheetHeaders)).find(
      (candidate) => candidate.record["id"] === chatId,
    );
    if (!row) return null;

    return {
      id: row.record["id"] || "",
      userId: row.record["user_id"] || "",
      conversation: row.record["conversation"] || "",
      conversationSummary: row.record["conversation_summary"] || "",
      lastIntent: row.record["last_intent"] || "",
      bookingStatus: row.record["booking_status"] || "",
      createdAt: row.record["created_at"] || "",
      updatedAt: row.record["updated_at"] || "",
    };
  }

  async function findEventById(eventId: string) {
    const row = (await getRows(eventSheetRange, eventSheetHeaders)).find(
      (candidate) => candidate.record["event_id"] === eventId,
    );
    if (!row) return null;

    return {
      eventId: row.record["event_id"] || "",
      name: row.record["name"] || "",
      startTime: row.record["start_time"] || "",
      endTime: row.record["end_time"] || "",
      pricingPerHour: parseFloat(row.record["pricing_per_hour"] || "0"),
      capacity: parseInt(row.record["capacity"] || "0", 10),
      bookedCustomers: parseInt(row.record["booked_customers"] || "0", 10),
      createdAt: row.record["created_at"] || "",
      updatedAt: row.record["updated_at"] || "",
    };
  }

  async function findEventByName(eventName: string) {
    const normalizedEventName = eventName.trim().toLowerCase();
    const row = (await getRows(eventSheetRange, eventSheetHeaders)).find(
      (candidate) =>
        candidate.record["name"].trim().toLowerCase() === normalizedEventName,
    );
    if (!row) return null;

    return {
      eventId: row.record["event_id"] || "",
      name: row.record["name"] || "",
      startTime: row.record["start_time"] || "",
      endTime: row.record["end_time"] || "",
      pricingPerHour: parseFloat(row.record["pricing_per_hour"] || "0"),
      capacity: parseInt(row.record["capacity"] || "0", 10),
      bookedCustomers: parseInt(row.record["booked_customers"] || "0", 10),
      createdAt: row.record["created_at"] || "",
      updatedAt: row.record["updated_at"] || "",
    };
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
    const rows = await getRows(eventSheetRange, eventSheetHeaders);

    return rows
      .map((row) => ({
        eventId: row.record["event_id"] || "",
        name: row.record["name"] || "",
        startTime: row.record["start_time"] || "",
        endTime: row.record["end_time"] || "",
        pricingPerHour: parseFloat(row.record["pricing_per_hour"] || "0"),
        capacity: parseInt(row.record["capacity"] || "0", 10),
        bookedCustomers: parseInt(row.record["booked_customers"] || "0", 10),
        createdAt: row.record["created_at"] || "",
        updatedAt: row.record["updated_at"] || "",
      }))
      .sort(
        (left, right) =>
          Date.parse(left.startTime) - Date.parse(right.startTime),
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

    const now = new Date().toISOString();
    const nextEventId = eventId ?? crypto.randomUUID();

    await appendSheetValues({
      accessToken: await getGoogleAccessToken(),
      spreadsheetId,
      range: eventSheetRange,
      values: [
        [
          nextEventId,
          name,
          startTime,
          endTime,
          String(pricingPerHour),
          String(capacity),
          String(bookedCustomers),
          now,
          now,
        ],
      ],
    });

    return {
      eventId: nextEventId,
      name,
      startTime,
      endTime,
      pricingPerHour,
      capacity,
      bookedCustomers,
      createdAt: now,
      updatedAt: now,
    };
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
    const storedEvent = (
      await getRows(eventSheetRange, eventSheetHeaders)
    ).find((candidate) => candidate.record["event_id"] === event.eventId);

    if (!storedEvent) {
      throw new Error("The event could not be found.");
    }

    if (event.endTime <= event.startTime) {
      throw new Error("endTime must be after startTime.");
    }

    if (event.bookedCustomers > event.capacity) {
      throw new Error("bookedCustomers cannot exceed capacity.");
    }

    const updatedEvent = {
      ...event,
      name: event.name,
      pricingPerHour: event.pricingPerHour,
      capacity: event.capacity,
      bookedCustomers: event.bookedCustomers,
      updatedAt: new Date().toISOString(),
    };

    await updateSheetValues({
      accessToken: await getGoogleAccessToken(),
      spreadsheetId,
      range: `Event!A${storedEvent.rowNumber}:I${storedEvent.rowNumber}`,
      values: [
        [
          updatedEvent.eventId,
          updatedEvent.name,
          updatedEvent.startTime,
          updatedEvent.endTime,
          String(updatedEvent.pricingPerHour),
          String(updatedEvent.capacity),
          String(updatedEvent.bookedCustomers),
          updatedEvent.createdAt,
          updatedEvent.updatedAt,
        ],
      ],
    });

    return {
      eventId: updatedEvent.eventId,
      name: updatedEvent.name,
      startTime: updatedEvent.startTime,
      endTime: updatedEvent.endTime,
      pricingPerHour: updatedEvent.pricingPerHour,
      capacity: updatedEvent.capacity,
      bookedCustomers: updatedEvent.bookedCustomers,
      createdAt: updatedEvent.createdAt,
      updatedAt: updatedEvent.updatedAt,
    };
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
    const now = new Date().toISOString();

    await appendSheetValues({
      accessToken: await getGoogleAccessToken(),
      spreadsheetId,
      range: chatSheetRange,
      values: [
        [
          chatId,
          userId,
          conversation,
          conversationSummary,
          lastIntent,
          bookingStatus,
          now,
          now,
        ],
      ],
    });

    return {
      id: chatId,
      userId,
      conversation,
      conversationSummary,
      lastIntent,
      bookingStatus,
      createdAt: now,
      updatedAt: now,
    };
  }

  async function createUserProfile({
    userId,
    bookedEventId = "",
    bookingStatus = "",
    lastChatSessionId,
    name = "",
    email = "",
    phone = "",
  }: UserProfileInput): Promise<UserProfile> {
    const createdAt = new Date().toISOString();

    await appendSheetValues({
      accessToken: await getGoogleAccessToken(),
      spreadsheetId,
      range: userSheetRange,
      values: [
        [
          userId,
          name,
          email,
          phone,
          lastChatSessionId || "",
          createdAt,
          bookingStatus,
          bookedEventId,
        ],
      ],
    });

    return {
      userId,
      name,
      email,
      phone,
      bookingStatus,
      bookedEventId,
      lastChatSessionId: lastChatSessionId || "",
      createdAt,
    };
  }

  async function upsertUserProfile({
    userId,
    bookedEventId,
    bookingStatus,
    lastChatSessionId,
    name,
    email,
    phone,
  }: UserProfileInput) {
    const userRow = (await getRows(userSheetRange, userSheetHeaders)).find(
      (candidate) => candidate.record["user_id"] === userId,
    );

    const user = userRow
      ? {
          rowNumber: userRow.rowNumber,
          userId: userRow.record["user_id"] || "",
          name: userRow.record["name"] || "",
          email: userRow.record["email"] || "",
          phone: userRow.record["phone"] || "",
          bookingStatus: userRow.record["booking_status"] || "",
          bookedEventId: userRow.record["booked_event_id"] || "",
          lastChatSessionId: userRow.record["last_chat_session_id"] || "",
          createdAt: userRow.record["created_at"] || "",
        }
      : null;

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
      });

      return {
        chat,
        user: createdUser,
      };
    }

    const nextUser = {
      userId,
      name: name ? name : user.name,
      email: email ? email : user.email,
      phone: phone ? phone : user.phone,
      bookingStatus: bookingStatus ?? user.bookingStatus,
      bookedEventId: bookedEventId ?? user.bookedEventId,
      lastChatSessionId: chat.id,
      createdAt: user.createdAt,
    };

    await updateSheetValues({
      accessToken: await getGoogleAccessToken(),
      spreadsheetId,
      range: `User!A${user.rowNumber}:H${user.rowNumber}`,
      values: [
        [
          nextUser.userId,
          nextUser.name,
          nextUser.email,
          nextUser.phone,
          nextUser.lastChatSessionId,
          nextUser.createdAt,
          nextUser.bookingStatus,
          nextUser.bookedEventId,
        ],
      ],
    });

    return {
      chat,
      user: nextUser,
    };
  }

  async function upsertChatSession({
    chatId,
    userId,
    conversation = JSON.stringify([]),
    conversationSummary,
    lastIntent,
    bookingStatus,
  }: ChatSessionInput) {
    const existingChatRow = (
      await getRows(chatSheetRange, chatSheetHeaders)
    ).find((candidate) => candidate.record["id"] === chatId);

    if (!existingChatRow) {
      return createChatSession({
        chatId,
        userId,
        conversation,
        conversationSummary,
        lastIntent,
        bookingStatus,
      });
    }

    const nextChat = {
      id: chatId,
      userId,
      conversation,
      conversationSummary:
        conversationSummary ??
        (existingChatRow.record["conversation_summary"] || ""),
      lastIntent: lastIntent ?? (existingChatRow.record["last_intent"] || ""),
      bookingStatus:
        bookingStatus ?? (existingChatRow.record["booking_status"] || ""),
      createdAt: existingChatRow.record["created_at"] || "",
      updatedAt: new Date().toISOString(),
    };

    await updateSheetValues({
      accessToken: await getGoogleAccessToken(),
      spreadsheetId,
      range: `Chat!A${existingChatRow.rowNumber}:H${existingChatRow.rowNumber}`,
      values: [
        [
          nextChat.id,
          nextChat.userId,
          nextChat.conversation,
          nextChat.conversationSummary,
          nextChat.lastIntent,
          nextChat.bookingStatus,
          nextChat.createdAt,
          nextChat.updatedAt,
        ],
      ],
    });

    return nextChat;
  }

  return {
    adjustEventBookedCustomers,
    createEventRecord,
    findEventById,
    findEventByName,
    findUserById,
    getUserBookingDetails,
    listEventsInRange,
    updateEventRecord,
    upsertChatSession,
    upsertUserProfile,
  };
}
