import type {
  SheetAppendResponse,
  SheetReadInput,
  SheetUpdateInput,
  SheetUpdateResponse,
  SheetValuesResponse,
} from "@/types/sheet.types";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4";

export function getSheetValues({
  accessToken,
  spreadsheetId,
  range,
}: SheetReadInput) {
  return fetch(
    `${SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}/values/${encodeURIComponent(range)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  ).then((response) => {
    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status}`);
    }

    return response.json() as Promise<SheetValuesResponse>;
  });
}

export function updateSheetValues({
  accessToken,
  spreadsheetId,
  range,
  values,
}: SheetUpdateInput) {
  return fetch(
    `${SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values,
      }),
    },
  ).then((response) => {
    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status}`);
    }

    return response.json() as Promise<SheetUpdateResponse>;
  });
}

export function appendSheetValues({
  accessToken,
  spreadsheetId,
  range,
  values,
}: SheetUpdateInput) {
  return fetch(
    `${SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}/values/${encodeURIComponent(
      range,
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values,
      }),
    },
  ).then((response) => {
    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status}`);
    }

    return response.json() as Promise<SheetAppendResponse>;
  });
}
