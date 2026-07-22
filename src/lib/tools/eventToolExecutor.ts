import { ChatCompletionMessageFunctionToolCall } from "openai/resources.js";

import type { ToolResult } from "@/types/tools.types";
import {
  createEvent,
  deleteEvent,
  listEventsForRange,
  updateEvent,
} from "@/lib/tools/eventActions";

export async function executeEventTool(
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolResult> {
  try {
    const args = JSON.parse(toolCall.function.arguments);

    switch (toolCall.function.name) {
      case "create_event_record": {
        const data = await createEvent(args);

        return {
          ok: true,
          message: "create_event_record completed",
          data,
          intent: "admin_event_create",
        };
      }

      case "update_event_record": {
        const { updatedCalendarEvent, eventRecord, previousEvent } =
          await updateEvent(args);

        return {
          ok: true,
          message: "update_event_record completed",
          data: {
            ...(updatedCalendarEvent ? { updatedCalendarEvent } : {}),
            eventRecord,
            previousEvent,
          },
          intent: "admin_event_update",
        };
      }

      case "delete_event_record": {
        const data = await deleteEvent(args);

        return {
          ok: true,
          message: "delete_event_record completed",
          data,
          intent: "admin_event_delete",
        };
      }

      case "list_events_in_range": {
        const data = await listEventsForRange(
          args["startTime"] as string,
          args["endTime"] as string,
        );

        return {
          ok: true,
          message: "list_events_in_range completed",
          data,
          intent: "event_lookup",
        };
      }

      default:
        return {
          ok: false,
          message: `Unknown event tool: ${toolCall.function.name}`,
        };
    }
  } catch (error) {
    return {
      ok: false,
      intent:
        toolCall.function.name === "create_event_record"
          ? "admin_event_create"
          : toolCall.function.name === "update_event_record"
            ? "admin_event_update"
            : toolCall.function.name === "delete_event_record"
              ? "admin_event_delete"
              : toolCall.function.name === "list_events_in_range"
                ? "event_lookup"
                : undefined,
      message: error instanceof Error ? error.message : "Event tool failed",
    };
  }
}
