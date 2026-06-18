export type SheetReadInput = {
  accessToken: string;
  spreadsheetId: string;
  range: string;
};

export type SheetUpdateInput = SheetReadInput & {
  values: string[][];
};

export type SheetDeleteDimensionInput = {
  accessToken: string;
  spreadsheetId: string;
  sheetId: number;
  dimension: "ROWS" | "COLUMNS";
  startIndex: number;
  endIndex: number;
};

export type SheetValuesResponse = {
  range: string;
  majorDimension: string;
  values?: string[][];
};

export type SheetUpdateResponse = {
  updatedRange: string;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
};

export type SheetAppendResponse = {
  spreadsheetId: string;
  tableRange: string;
  updates: SheetUpdateResponse;
};

export type SheetRecordRow = {
  rowNumber: number;
  record: Record<string, string>;
};

export type UserProfileInput = {
  userId: string;
  bookedEventId?: string;
  bookingStatus?: string;
  lastChatSessionId?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: "admin" | "user";
};

export type ChatSessionInput = {
  chatId: string;
  userId: string;
  conversation?: string;
  conversationSummary?: string;
  lastIntent?: string;
  bookingStatus?: string;
};
