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
