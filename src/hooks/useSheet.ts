import { googleApi } from "@/lib/googleApi";
import { getGoogleAccessToken } from "@/lib/googleAuth";
import type { EventRangeInput, EventRecord, EventRecordInput } from "@/types/event.types";
import type { OpenAIChatMessage } from "@/types/openai.types";
import type {
  ChatSessionBootstrap,
  ChatSessionRecord,
  UserProfile,
} from "@/types/session.types";
import type {
  SheetDeleteDimensionInput,
  SheetReadInput,
  SheetAppendResponse,
  SheetUpdateResponse,
  SheetValuesResponse,
  SheetUpdateInput,
} from "@/types/sheet.types";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4";
const userSheetRange = process.env.GOOGLE_USER_SHEET_RANGE || "User!A:H";
const chatSheetRange = process.env.GOOGLE_CHAT_SHEET_RANGE || "Chat!A:H";
const eventSheetRange = process.env.GOOGLE_EVENT_SHEET_RANGE || "Event!A:I";

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

type SheetRecordRow = {
  rowNumber: number;
  record: Record<string, string>;
};

type StoredUserRecord = UserProfile & {
  rowNumber: number;
};

type StoredChatRecord = ChatSessionRecord & {
  rowNumber: number;
};

type StoredEventRecord = EventRecord & {
  rowNumber: number;
};

type UserProfileInput = {
  userId: string;
  bookedEventId?: string;
  bookingStatus?: string;
  lastChatSessionId?: string;
  name?: string;
  email?: string;
  phone?: string;
};

type ChatSessionInput = {
  chatId: string;
  userId: string;
  conversation?: string;
  conversationSummary?: string;
  lastIntent?: string;
  bookingStatus?: string;
};

function getColumnLabel(columnNumber: number) {
  let label = "";
  let remaining = columnNumber;

  while (remaining > 0) {
    const current = (remaining - 1) % 26;
    label = String.fromCharCode(65 + current) + label;
    remaining = Math.floor((remaining - 1) / 26);
  }

  return label;
}

function getRangeSheetName(range: string) {
  return range.split("!")[0] || range;
}

function expandRange(range: string, columnCount: number) {
  return `${getRangeSheetName(range)}!A:${getColumnLabel(columnCount)}`;
}

function getSpreadsheetId() {
  return process.env.GOOGLE_SPREADSHEET_ID;
}

function toRecord(headers: readonly string[], values: string[]) {
  return headers.reduce<Record<string, string>>((record, header, index) => {
    record[header] = values[index] || "";
    return record;
  }, {});
}

function toRowValues(
  headers: readonly string[],
  values: Record<string, string | undefined>,
) {
  return headers.map((header) => values[header] || "");
}

function toPublicUserProfile(user: StoredUserRecord): UserProfile {
  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    bookingStatus: user.bookingStatus,
    bookedEventId: user.bookedEventId,
    lastChatSessionId: user.lastChatSessionId,
    createdAt: user.createdAt,
  };
}

function toPublicChatSession(chat: StoredChatRecord): ChatSessionRecord {
  return {
    id: chat.id,
    userId: chat.userId,
    conversation: chat.conversation,
    conversationSummary: chat.conversationSummary,
    lastIntent: chat.lastIntent,
    bookingStatus: chat.bookingStatus,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
}

function toPublicEventRecord(event: StoredEventRecord): EventRecord {
  return {
    eventId: event.eventId,
    name: event.name,
    startTime: event.startTime,
    endTime: event.endTime,
    pricingPerHour: event.pricingPerHour,
    capacity: event.capacity,
    bookedCustomers: event.bookedCustomers,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function parseDateTime(value: string, label: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new Error(`${label} must be a valid RFC3339 date-time.`);
  }

  return timestamp;
}

function parseNonNegativeNumber(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }

  return parsed;
}

function parseNonNegativeInteger(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return parsed;
}

function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) {
  return startA < endB && startB < endA;
}

function parseConversation(conversation: string) {
  if (!conversation) {
    return [];
  }

  try {
    const messages = JSON.parse(conversation) as unknown;

    if (!Array.isArray(messages)) {
      return [];
    }

    return messages.filter(
      (message): message is OpenAIChatMessage =>
        !!message &&
        typeof message === "object" &&
        ("role" in message &&
          "content" in message &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string"),
    );
  } catch {
    return [];
  }
}

async function requireGoogleAccessToken() {
  const accessToken = await getGoogleAccessToken();

  if (!accessToken) {
    throw new Error("Google access token is required for Sheets tools");
  }

  return accessToken;
}

function requireSpreadsheetId() {
  const spreadsheetId = getSpreadsheetId();

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SPREADSHEET_ID is required for Sheets tools");
  }

  return spreadsheetId;
}

export function createSheetClient() {
  function getSheetValues({
    accessToken,
    spreadsheetId,
    range,
  }: SheetReadInput) {
    return googleApi<SheetValuesResponse>(
      `${SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(
        spreadsheetId,
      )}/values/${encodeURIComponent(range)}`,
      {
        accessToken,
        method: "GET",
      },
    );
  }

  function updateSheetValues({
    accessToken,
    spreadsheetId,
    range,
    values,
  }: SheetUpdateInput) {
    return googleApi<SheetUpdateResponse>(
      `${SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(
        spreadsheetId,
      )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        accessToken,
        method: "PUT",
        body: JSON.stringify({
          range,
          majorDimension: "ROWS",
          values,
        }),
      },
    );
  }

  function appendSheetValues({
    accessToken,
    spreadsheetId,
    range,
    values,
  }: SheetUpdateInput) {
    return googleApi<SheetAppendResponse>(
      `${SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(
        spreadsheetId,
      )}/values/${encodeURIComponent(
        range,
      )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        accessToken,
        method: "POST",
        body: JSON.stringify({
          range,
          majorDimension: "ROWS",
          values,
        }),
      },
    );
  }

  function clearSheetValues({
    accessToken,
    spreadsheetId,
    range,
  }: SheetReadInput) {
    return googleApi<Record<string, never>>(
      `${SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(
        spreadsheetId,
      )}/values/${encodeURIComponent(range)}:clear`,
      {
        accessToken,
        method: "POST",
        body: JSON.stringify({}),
      },
    );
  }

  function deleteSheetDimension({
    accessToken,
    spreadsheetId,
    sheetId,
    dimension,
    startIndex,
    endIndex,
  }: SheetDeleteDimensionInput) {
    return googleApi<Record<string, unknown>>(
      `${SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(
        spreadsheetId,
      )}:batchUpdate`,
      {
        accessToken,
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension,
                  startIndex,
                  endIndex,
                },
              },
            },
          ],
        }),
      },
    );
  }

  async function getRows(range: string, headers: readonly string[]) {
    const valuesResponse = await getSheetValues({
      accessToken: await requireGoogleAccessToken(),
      spreadsheetId: requireSpreadsheetId(),
      range: expandRange(range, headers.length),
    });
    const rows = valuesResponse.values || [];

    return rows.slice(1).map<SheetRecordRow>((values, index) => ({
      rowNumber: index + 2,
      record: toRecord(headers, values),
    }));
  }

  async function findRowByField(
    range: string,
    headers: readonly string[],
    field: string,
    value: string,
  ) {
    const rows = await getRows(range, headers);

    return rows.find((row) => row.record[field] === value) || null;
  }

  async function updateRow(
    range: string,
    rowNumber: number,
    values: string[],
  ) {
    await updateSheetValues({
      accessToken: await requireGoogleAccessToken(),
      spreadsheetId: requireSpreadsheetId(),
      range: `${getRangeSheetName(range)}!A${rowNumber}:${getColumnLabel(
        values.length,
      )}${rowNumber}`,
      values: [values],
    });
  }

  async function appendRow(range: string, values: string[]) {
    await appendSheetValues({
      accessToken: await requireGoogleAccessToken(),
      spreadsheetId: requireSpreadsheetId(),
      range: expandRange(range, values.length),
      values: [values],
    });
  }

  function toUserProfile(row: SheetRecordRow): StoredUserRecord {
    return {
      rowNumber: row.rowNumber,
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

  function toChatSession(row: SheetRecordRow): StoredChatRecord {
    return {
      rowNumber: row.rowNumber,
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

  function toEventRecord(row: SheetRecordRow): StoredEventRecord {
    return {
      rowNumber: row.rowNumber,
      eventId: row.record["event_id"] || "",
      name: row.record["name"] || "",
      startTime: row.record["start_time"] || "",
      endTime: row.record["end_time"] || "",
      pricingPerHour: parseNonNegativeNumber(
        row.record["pricing_per_hour"] || "0",
        "pricing_per_hour",
      ),
      capacity: parseNonNegativeInteger(
        row.record["capacity"] || "0",
        "capacity",
      ),
      bookedCustomers: parseNonNegativeInteger(
        row.record["booked_customers"] || "0",
        "booked_customers",
      ),
      createdAt: row.record["created_at"] || "",
      updatedAt: row.record["updated_at"] || "",
    };
  }

  async function findStoredUserById(userId: string) {
    const row = await findRowByField(
      userSheetRange,
      userSheetHeaders,
      "user_id",
      userId,
    );

    return row ? toUserProfile(row) : null;
  }

  async function findStoredChatById(chatId: string) {
    const row = await findRowByField(
      chatSheetRange,
      chatSheetHeaders,
      "id",
      chatId,
    );

    return row ? toChatSession(row) : null;
  }

  async function findStoredEventById(eventId: string) {
    const row = await findRowByField(
      eventSheetRange,
      eventSheetHeaders,
      "event_id",
      eventId,
    );

    return row ? toEventRecord(row) : null;
  }

  async function findUserById(userId: string) {
    const user = await findStoredUserById(userId);

    return user ? toPublicUserProfile(user) : null;
  }

  async function findChatById(chatId: string) {
    const chat = await findStoredChatById(chatId);

    return chat ? toPublicChatSession(chat) : null;
  }

  async function findEventById(eventId: string) {
    const event = await findStoredEventById(eventId);

    return event ? toPublicEventRecord(event) : null;
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
      .map(toEventRecord)
      .map(toPublicEventRecord)
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
    const startTimestamp = parseDateTime(startTime, "startTime");
    const endTimestamp = parseDateTime(endTime, "endTime");
    const parsedPricingPerHour = parseNonNegativeNumber(
      String(pricingPerHour),
      "pricingPerHour",
    );
    const parsedCapacity = parseNonNegativeInteger(
      String(capacity),
      "capacity",
    );
    const parsedBookedCustomers = parseNonNegativeInteger(
      String(bookedCustomers),
      "bookedCustomers",
    );

    if (endTimestamp <= startTimestamp) {
      throw new Error("endTime must be after startTime.");
    }

    if (parsedBookedCustomers > parsedCapacity) {
      throw new Error("bookedCustomers cannot exceed capacity.");
    }

    const now = new Date().toISOString();
    const nextEventId = eventId || crypto.randomUUID();

    await appendRow(
      eventSheetRange,
      toRowValues(eventSheetHeaders, {
        event_id: nextEventId,
        name,
        start_time: startTime,
        end_time: endTime,
        pricing_per_hour: String(parsedPricingPerHour),
        capacity: String(parsedCapacity),
        booked_customers: String(parsedBookedCustomers),
        created_at: now,
        updated_at: now,
      }),
    );

    const rows = await getRows(eventSheetRange, eventSheetHeaders);
    const createdEvent = rows
      .map(toEventRecord)
      .find((event) => event.eventId === nextEventId);

    if (!createdEvent) {
      throw new Error("Unable to create event row.");
    }

    return toPublicEventRecord(createdEvent);
  }

  async function listEventsInRange({
    startTime,
    endTime,
  }: EventRangeInput): Promise<EventRecord[]> {
    const rangeStart = parseDateTime(startTime, "startTime");
    const rangeEnd = parseDateTime(endTime, "endTime");

    if (rangeEnd <= rangeStart) {
      throw new Error("endTime must be after startTime.");
    }

    const events = await listEvents();

    return events.filter((event) =>
      rangesOverlap(
        Date.parse(event.startTime),
        Date.parse(event.endTime),
        rangeStart,
        rangeEnd,
      ),
    );
  }

  async function updateEventRecord(event: EventRecord) {
    const storedEvent = await findStoredEventById(event.eventId);

    if (!storedEvent) {
      throw new Error("The class event could not be found.");
    }

    const updatedEvent = {
      ...event,
      updatedAt: new Date().toISOString(),
    };

    await updateRow(
      eventSheetRange,
      storedEvent.rowNumber,
      toRowValues(eventSheetHeaders, {
        event_id: updatedEvent.eventId,
        name: updatedEvent.name,
        start_time: updatedEvent.startTime,
        end_time: updatedEvent.endTime,
        pricing_per_hour: String(updatedEvent.pricingPerHour),
        capacity: String(updatedEvent.capacity),
        booked_customers: String(updatedEvent.bookedCustomers),
        created_at: updatedEvent.createdAt,
        updated_at: updatedEvent.updatedAt,
      }),
    );

    return updatedEvent;
  }

  async function adjustEventBookedCustomers(eventId: string, change: number) {
    if (!Number.isInteger(change) || change === 0) {
      throw new Error("Booked customer adjustment must be a non-zero integer.");
    }

    const event = await findEventById(eventId);

    if (!event) {
      throw new Error("The class event could not be found.");
    }

    const nextBookedCustomers = event.bookedCustomers + change;

    if (nextBookedCustomers < 0) {
      throw new Error("bookedCustomers cannot be negative.");
    }

    if (nextBookedCustomers > event.capacity) {
      throw new Error("This class is already full.");
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

    await appendRow(
      chatSheetRange,
      toRowValues(chatSheetHeaders, {
        id: chatId,
        user_id: userId,
        conversation,
        conversation_summary: conversationSummary,
        last_intent: lastIntent,
        booking_status: bookingStatus,
        created_at: now,
        updated_at: now,
      }),
    );

    const createdChat = await findStoredChatById(chatId);

    if (!createdChat) {
      throw new Error("Unable to create chat session row.");
    }

    return toPublicChatSession(createdChat);
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

    await appendRow(
      userSheetRange,
      toRowValues(userSheetHeaders, {
        user_id: userId,
        name,
        email,
        phone,
        last_chat_session_id: lastChatSessionId || "",
        created_at: createdAt,
        booking_status: bookingStatus,
        booked_event_id: bookedEventId,
      }),
    );

    const createdUser = await findStoredUserById(userId);

    if (!createdUser) {
      throw new Error("Unable to create user row.");
    }

    return toPublicUserProfile(createdUser);
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
    const user = await findStoredUserById(userId);
    let resolvedChatId = lastChatSessionId || user?.lastChatSessionId || "";

    if (!resolvedChatId) {
      resolvedChatId = crypto.randomUUID();
    }

    let chat = await findChatById(resolvedChatId);

    if (!chat) {
      chat = await createChatSession({
        chatId: resolvedChatId,
        userId,
      });
    }

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
      name: name ?? user.name,
      email: email ?? user.email,
      phone: phone ?? user.phone,
      bookingStatus: bookingStatus ?? user.bookingStatus,
      bookedEventId: bookedEventId ?? user.bookedEventId,
      lastChatSessionId: chat.id,
      createdAt: user.createdAt,
    };

    await updateRow(
      userSheetRange,
      user.rowNumber,
      toRowValues(userSheetHeaders, {
        user_id: nextUser.userId,
        name: nextUser.name,
        email: nextUser.email,
        phone: nextUser.phone,
        last_chat_session_id: nextUser.lastChatSessionId,
        created_at: nextUser.createdAt,
        booking_status: nextUser.bookingStatus,
        booked_event_id: nextUser.bookedEventId,
      }),
    );

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
    const existingChat = await findStoredChatById(chatId);

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

    const nextChat = {
      id: chatId,
      userId,
      conversation,
      conversationSummary:
        conversationSummary ?? existingChat.conversationSummary,
      lastIntent: lastIntent ?? existingChat.lastIntent,
      bookingStatus: bookingStatus ?? existingChat.bookingStatus,
      createdAt: existingChat.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await updateRow(
      chatSheetRange,
      existingChat.rowNumber,
      toRowValues(chatSheetHeaders, {
        id: nextChat.id,
        user_id: nextChat.userId,
        conversation: nextChat.conversation,
        conversation_summary: nextChat.conversationSummary,
        last_intent: nextChat.lastIntent,
        booking_status: nextChat.bookingStatus,
        created_at: nextChat.createdAt,
        updated_at: nextChat.updatedAt,
      }),
    );

    return nextChat;
  }

  async function getOrCreateChatSession(userId: string): Promise<ChatSessionBootstrap> {
    const { chat, user } = await upsertUserProfile({ userId });

    return {
      user,
      chat,
      messages: parseConversation(chat.conversation),
    };
  }

  return {
    appendSheetValues,
    adjustEventBookedCustomers,
    clearSheetValues,
    createEventRecord,
    deleteSheetDimension,
    findChatById,
    findEventById,
    findUserById,
    getOrCreateChatSession,
    getUserBookingDetails,
    getSheetValues,
    getSpreadsheetId,
    listEvents,
    listEventsInRange,
    parseConversation,
    requireGoogleAccessToken,
    requireSpreadsheetId,
    updateSheetValues,
    upsertChatSession,
    upsertUserProfile,
  };
}
