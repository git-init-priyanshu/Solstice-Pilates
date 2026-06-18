import { ChatCompletionMessageFunctionToolCall } from "openai/resources.js";

import { createCalendarClient } from "@/hooks/useCalendar";
import { createSheetClient } from "@/hooks/useSheet";
import type { ToolArgs, ToolResult } from "@/types/tools.types";

const { createEventRecord, listEventsInRange } = createSheetClient();
const {
  cancelCalendarEvent,
  getCalendarId,
  requireGoogleAccessToken,
  scheduleCalendarEvent,
} = createCalendarClient();

function getIntentForTool(name: string) {
  switch (name) {
    case "create_event_record":
      return "admin_event_create";
    case "list_events_in_range":
      return "event_lookup";
    default:
      return undefined;
  }
}

export async function executeEventTool(
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolResult> {
  try {
    const args = toolCall.function.arguments
      ? (JSON.parse(toolCall.function.arguments) as ToolArgs)
      : {};

    switch (toolCall.function.name) {
      case "create_event_record": {
        const name = args["name"] as string;
        const startTime = args["startTime"] as string;
        const endTime = args["endTime"] as string;
        const pricingPerHour = Number(args["pricingPerHour"]);
        const capacity = Number(args["capacity"]);
        const accessToken = await requireGoogleAccessToken();
        const calendarEvent = await scheduleCalendarEvent({
          accessToken,
          calendarId: getCalendarId(),
          summary: name,
          startDateTime: startTime,
          endDateTime: endTime,
          description: "Created by Solstice Pilates admin assistant.",
        });

        if (!calendarEvent.id) {
          throw new Error("Google Calendar did not return an event ID.");
        }

        try {
          const eventRecord = await createEventRecord({
            eventId: calendarEvent.id,
            name,
            startTime,
            endTime,
            pricingPerHour,
            capacity,
          });

          return {
            ok: true,
            message: "create_event_record completed",
            data: {
              calendarEvent,
              eventRecord,
            },
            intent: "admin_event_create",
          };
        } catch (error) {
          await cancelCalendarEvent({
            accessToken,
            calendarId: getCalendarId(),
            eventId: calendarEvent.id,
          });

          throw error;
        }
      }

      case "list_events_in_range": {
        const startTime = args["startTime"] as string;
        const endTime = args["endTime"] as string;
        const data = await listEventsInRange({
          startTime,
          endTime,
        });

        return {
          ok: true,
          message: "list_events_in_range completed",
          data: {
            events: data.map((event) => ({
              ...event,
              availabilityStatus:
                event.bookedCustomers < event.capacity ? "available" : "full",
              remainingSpots: Math.max(event.capacity - event.bookedCustomers, 0),
            })),
            count: data.length,
            hasEvents: data.length > 0,
            interpretation:
              data.length > 0
                ? "One or more classes are scheduled in this time window."
                : "No classes are scheduled in this time window.",
            guidance:
              "Use capacity and bookedCustomers to answer availability. Use pricingPerHour to answer pricing questions.",
          },
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
      intent: getIntentForTool(toolCall.function.name),
      message: error instanceof Error ? error.message : "Event tool failed",
    };
  }
}
