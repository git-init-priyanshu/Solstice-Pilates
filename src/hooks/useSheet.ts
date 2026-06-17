import { googleApi } from "@/lib/googleApi";
import { getGoogleAccessToken } from "@/lib/googleAuth";
import type {
  SheetDeleteDimensionInput,
  SheetReadInput,
  SheetAppendResponse,
  SheetUpdateResponse,
  SheetValuesResponse,
  SheetUpdateInput,
} from "@/types/sheet.types";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4";

function getSpreadsheetId() {
  return process.env.GOOGLE_SPREADSHEET_ID;
}

function getSheetId() {
  return Number(process.env.GOOGLE_SHEET_ID || 0);
}

function getLogRange() {
  return process.env.GOOGLE_SHEET_LOG_RANGE || "Sheet1!A:L";
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
  async function appendLogRow(values: string[]) {
    return appendSheetValues({
      accessToken: await requireGoogleAccessToken(),
      spreadsheetId: requireSpreadsheetId(),
      range: getLogRange(),
      values: [values],
    });
  }

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

  function logConversationToSheet({
    assistantReply,
    bookingStatus,
    chatId,
    customerEmail,
    customerName,
    customerPhone,
    intent,
    toolsUsed,
    userId,
    userMessage,
  }: {
    assistantReply: string;
    bookingStatus?: string;
    chatId?: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    intent?: string;
    toolsUsed: string[];
    userId?: string;
    userMessage: string;
  }) {
    const now = new Date().toISOString();

    return appendLogRow([
      chatId || crypto.randomUUID(),
      userId || "",
      customerName || "",
      customerPhone || "",
      customerEmail || "",
      "",
      `User: ${userMessage}\nAssistant: ${assistantReply}`,
      intent || "chat",
      bookingStatus || "",
      toolsUsed.length > 0 ? `tools: ${toolsUsed.join(", ")}` : "answered",
      now,
      now,
    ]).catch(() => {
      // Logging should not block Calendar operations.
    });
  }

  return {
    appendSheetValues,
    clearSheetValues,
    deleteSheetDimension,
    getSheetId,
    getSheetValues,
    getLogRange,
    getSpreadsheetId,
    logConversationToSheet,
    requireGoogleAccessToken,
    requireSpreadsheetId,
    updateSheetValues,
  };
}
