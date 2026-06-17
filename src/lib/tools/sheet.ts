import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const sheetTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "view_sheet_values",
      description:
        "Read rows, columns, or cells from the configured Google Sheet.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          range: { type: "string", description: "A1 notation range." },
        },
        required: ["range"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_sheet_values",
      description:
        "Edit rows, columns, or cells in the configured Google Sheet.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          range: { type: "string", description: "A1 notation range." },
          values: {
            type: "array",
            items: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        required: ["range", "values"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_sheet_cells",
      description:
        "Clear values from a cell range in the configured Google Sheet.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          range: { type: "string", description: "A1 notation range." },
        },
        required: ["range"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_sheet_rows",
      description: "Delete rows from the configured Google Sheet.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          startIndex: {
            type: "number",
            description: "Zero-based inclusive row.",
          },
          endIndex: {
            type: "number",
            description: "Zero-based exclusive row.",
          },
        },
        required: ["startIndex", "endIndex"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_sheet_columns",
      description: "Delete columns from the configured Google Sheet.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          startIndex: {
            type: "number",
            description: "Zero-based inclusive column.",
          },
          endIndex: {
            type: "number",
            description: "Zero-based exclusive column.",
          },
        },
        required: ["startIndex", "endIndex"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_call_to_sheet",
      description:
        "Log a client interaction, call request, booking, cancellation, or handoff in Google Sheets.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          customerName: { type: "string" },
          customerPhone: { type: "string" },
          customerEmail: { type: "string" },
          conversation: { type: "string" },
          intent: { type: "string" },
          lastConversationSummary: { type: "string" },
          status: { type: "string" },
          notes: { type: "string" },
        },
        required: ["intent", "status", "notes"],
      },
    },
  },
];
