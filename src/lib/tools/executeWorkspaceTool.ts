import type { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";

import { executeCalendarTool } from "@/lib/calendarToolExecutor";
import { executeSheetTool } from "@/lib/sheetToolExecutor";
import type { WorkspaceToolContext } from "@/types/tools.types";

export async function executeWorkspaceTool(
  toolCall: ChatCompletionMessageToolCall,
  context: WorkspaceToolContext = {},
) {
  if (toolCall.type !== "function") {
    return {
      ok: false,
      message: "Unsupported custom tool call",
    };
  }

  const toolName = toolCall.function.name;

  if (toolName.includes("calendar")) {
    return executeCalendarTool(toolCall, context);
  }

  if (toolName.includes("sheet")) {
    return executeSheetTool(toolCall, context);
  }

  return {
    ok: false,
    message: `Unknown workspace tool: ${toolName}`,
  };
}
