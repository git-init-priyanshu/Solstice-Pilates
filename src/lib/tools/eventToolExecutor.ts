import { ChatCompletionMessageFunctionToolCall } from "openai/resources.js";

import { useSheet } from "@/hooks/useSheet";
import { getGoogleAccessToken } from "@/lib/googleApi";
import type { EventRecord } from "@/types/event.types";
import type { ToolResult } from "@/types/tools.types";
import { scheduleCalendarEvent, updateCalendarEvent } from "@/lib/calendarApi";

const {
  createEventRecord,
  findEventById,
  listEventsInRange,
  updateEventRecord,
} = useSheet();

export async function executeEventTool(
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolResult> {
  try {
    const args = JSON.parse(toolCall.function.arguments);

    switch (toolCall.function.name) {
      case "create_event_record": {
        const name = args["name"];
        const startTime = args["startTime"];
        const endTime = args["endTime"];
        const pricingPerHour = Number(args["pricingPerHour"]);
        const capacity = Number(args["capacity"]);

        // Create event in calendar
        const accessToken = await getGoogleAccessToken();
        const calendarEvent = await scheduleCalendarEvent({
          accessToken,
          calendarId: "primary",
          summary: name,
          startDateTime: startTime,
          endDateTime: endTime,
          description: "Created by Solstice Pilates admin assistant.",
        });

        if (!calendarEvent.id) {
          throw new Error("Google Calendar did not return an event ID.");
        }

        // Append event data in sheet
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
      }

      case "update_event_record": {
        const eventId = args["eventId"] as string;

        const existingEvent = await findEventById(eventId);
        if (!existingEvent) {
          throw new Error("The selected class event could not be found.");
        }

        const updatedEvent: EventRecord = {
          ...existingEvent,
          name: args["name"] ?? existingEvent.name,
          startTime: args["startTime"] ?? existingEvent.startTime,
          endTime: args["endTime"] ?? existingEvent.endTime,
          pricingPerHour: Number(
            args["pricingPerHour"] ?? existingEvent.pricingPerHour,
          ),
          capacity: Number(args["capacity"] ?? existingEvent.capacity),
        };

        const shouldUpdateCalendar =
          updatedEvent.name !== existingEvent.name ||
          updatedEvent.startTime !== existingEvent.startTime ||
          updatedEvent.endTime !== existingEvent.endTime;

        let updatedCalendarEvent = null;
        if (shouldUpdateCalendar) {
          const accessToken = await getGoogleAccessToken();
          updatedCalendarEvent = await updateCalendarEvent({
            accessToken,
            calendarId: "primary",
            eventId,
            summary: updatedEvent.name,
            startDateTime: updatedEvent.startTime,
            endDateTime: updatedEvent.endTime,
          });
        }

        // Update event in sheet
        const eventRecord = await updateEventRecord(updatedEvent);

        return {
          ok: true,
          message: "update_event_record completed",
          data: {
            ...(updatedCalendarEvent ? { updatedCalendarEvent } : {}),
            eventRecord,
            previousEvent: existingEvent,
          },
          intent: "admin_event_update",
        };
      }

      case "list_events_in_range": {
        const startTime = args["startTime"] as string;
        const endTime = args["endTime"] as string;

        // Get all event in specified range sorted.
        const data = await listEventsInRange({
          startTime,
          endTime,
        });

        return {
          ok: true,
          message: "list_events_in_range completed",
          data: {
            events: data,
            count: data.length,
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
      intent:
        toolCall.function.name === "create_event_record"
          ? "admin_event_create"
          : toolCall.function.name === "update_event_record"
            ? "admin_event_update"
            : toolCall.function.name === "list_events_in_range"
              ? "event_lookup"
              : undefined,
      message: "Event tool failed",
    };
  }
}
