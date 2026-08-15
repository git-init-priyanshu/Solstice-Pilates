import type { ToolArgs, ToolResult } from "@/types/tools.types";
import {
  createEvent,
  deleteEvent,
  listEventsForRange,
  updateEvent,
} from "@/lib/tools/eventActions";

export async function executeEventTool(
  name: string,
  args: ToolArgs,
): Promise<ToolResult> {
  switch (name) {
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
      throw new Error(`Unknown event tool: ${name}`);
  }
}
