import { ChatCompletionMessageFunctionToolCall } from "openai/resources.js";

import { createSheetClient } from "@/hooks/useSheet";
import type {
  ToolArgs,
  ToolResult,
  WorkspaceToolContext,
} from "@/types/tools.types";

const {
  appendSheetValues,
  clearSheetValues,
  deleteSheetDimension,
  getSheetId,
  getSheetValues,
  requireGoogleAccessToken,
  requireSpreadsheetId,
  updateSheetValues,
} = createSheetClient();

export async function executeSheetTool(
  toolCall: ChatCompletionMessageFunctionToolCall,
  context: WorkspaceToolContext = {},
): Promise<ToolResult> {
  try {
    const accessToken = await requireGoogleAccessToken();
    const spreadsheetId = requireSpreadsheetId();
    const args = toolCall.function.arguments
      ? (JSON.parse(toolCall.function.arguments) as ToolArgs)
      : {};

    switch (toolCall.function.name) {
      case "view_sheet_values":
        return {
          ok: true,
          message: "view_sheet_values completed",
          data: await getSheetValues({
            accessToken,
            spreadsheetId,
            range: args["range"] as string,
          }),
        };

      case "update_sheet_values":
        return {
          ok: true,
          message: "update_sheet_values completed",
          data: await updateSheetValues({
            accessToken,
            spreadsheetId,
            range: args["range"] as string,
            values: args["values"] as string[][],
          }),
        };

      case "clear_sheet_cells":
        return {
          ok: true,
          message: "clear_sheet_cells completed",
          data: await clearSheetValues({
            accessToken,
            spreadsheetId,
            range: args["range"] as string,
          }),
        };

      case "delete_sheet_rows":
        return {
          ok: true,
          message: "delete_sheet_rows completed",
          data: await deleteSheetDimension({
            accessToken,
            spreadsheetId,
            sheetId: getSheetId(),
            dimension: "ROWS",
            startIndex: args["startIndex"] as number,
            endIndex: args["endIndex"] as number,
          }),
        };

      case "delete_sheet_columns":
        return {
          ok: true,
          message: "delete_sheet_columns completed",
          data: await deleteSheetDimension({
            accessToken,
            spreadsheetId,
            sheetId: getSheetId(),
            dimension: "COLUMNS",
            startIndex: args["startIndex"] as number,
            endIndex: args["endIndex"] as number,
          }),
        };

      case "log_call_to_sheet": {
        const now = new Date().toISOString();

        return {
          ok: true,
          message: "log_call_to_sheet completed",
          data: await appendSheetValues({
            accessToken,
            spreadsheetId,
            range: process.env.GOOGLE_SHEET_LOG_RANGE || "Sheet1!A:L",
            values: [
              [
                context.chatId || crypto.randomUUID(),
                context.userId || "",
                (args["customerName"] as string) || "",
                (args["customerPhone"] as string) || "",
                (args["customerEmail"] as string) || "",
                (args["lastConversationSummary"] as string) || "",
                (args["conversation"] as string) || "",
                args["intent"] as string,
                args["status"] as string,
                args["notes"] as string,
                now,
                now,
              ],
            ],
          }),
        };
      }

      default:
        return {
          ok: false,
          message: `Unknown sheet tool: ${toolCall.function.name}`,
        };
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Sheet tool failed",
    };
  }
}
