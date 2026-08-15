import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

import { bookingTools } from "@/lib/tools/booking";
import { adminEventTools, eventLookupTools } from "@/lib/tools/event";
import { executeBookingTool } from "@/lib/tools/bookingToolExecutor";
import { executeEventTool } from "@/lib/tools/eventToolExecutor";
import type {
  AgentScope,
  ToolArgs,
  ToolResult,
  WorkspaceToolContext,
} from "@/types/tools.types";

type ToolExecutor = (
  name: string,
  args: ToolArgs,
  toolContext: WorkspaceToolContext,
) => Promise<ToolResult>;

type ToolDefinition = {
  schema: ChatCompletionFunctionTool;
  scopes: AgentScope[];
  intent: string;
  execute: ToolExecutor;
};

const toolIntents: Record<string, string> = {
  create_event_record: "admin_event_create",
  update_event_record: "admin_event_update",
  delete_event_record: "admin_event_delete",
  list_events_in_range: "event_lookup",
  create_user_booking: "booking",
  change_user_booking: "booking_change",
  cancel_user_booking: "booking_cancel",
  get_user_booking_status: "booking_status",
  find_alternative_event_options: "booking_change_lookup",
  check_booking_guest_capacity: "booking_guest_capacity",
  request_human_handoff: "human_handoff",
};

const toolRegistry = new Map<string, ToolDefinition>();

function registerTools(
  schemas: ChatCompletionFunctionTool[],
  scopes: AgentScope[],
  execute: ToolExecutor,
) {
  for (const schema of schemas) {
    toolRegistry.set(schema.function.name, {
      schema,
      scopes,
      intent: toolIntents[schema.function.name] ?? "",
      execute,
    });
  }
}

registerTools(adminEventTools, ["admin"], executeEventTool);
registerTools(eventLookupTools, ["admin", "client", "voice"], executeEventTool);
registerTools(bookingTools, ["client", "voice"], executeBookingTool);

export function toolSchemasFor(scope: AgentScope) {
  return [...toolRegistry.values()]
    .filter((tool) => tool.scopes.includes(scope))
    .map((tool) => tool.schema);
}

export async function runTool(
  name: string,
  rawArguments: string,
  scope: AgentScope,
  toolContext: WorkspaceToolContext,
): Promise<ToolResult> {
  const tool = toolRegistry.get(name);

  if (!tool) {
    return { ok: false, message: `Unknown tool: ${name}` };
  }

  if (!tool.scopes.includes(scope)) {
    return {
      ok: false,
      intent: tool.intent,
      message: `The ${scope} assistant is not allowed to call ${name}.`,
    };
  }

  try {
    return await tool.execute(
      name,
      JSON.parse(rawArguments || "{}"),
      toolContext,
    );
  } catch (error) {
    return {
      ok: false,
      intent: tool.intent,
      message: error instanceof Error ? error.message : `${name} failed`,
    };
  }
}
