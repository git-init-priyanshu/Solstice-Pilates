import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { sheetTools } from "@/lib/tools/sheet";
import { calendarTools } from "@/lib/tools/calendar";

export const workspaceAgentTools: ChatCompletionTool[] = [
  ...calendarTools,
  ...sheetTools,
];
