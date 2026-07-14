import { ChatCompletionMessageFunctionToolCall } from "openai/resources.js";

import { useDatabase as sheetApi } from "@/lib/database";
import { getGoogleAccessToken } from "@/lib/googleApi";
import type { EventRecord } from "@/types/event.types";
import type { ToolResult } from "@/types/tools.types";
import { scheduleCalendarEvent, updateCalendarEvent } from "@/lib/calendarApi";

const {
  createEventRecord,
  findEventById,
  listEventsInRange,
  updateEventRecord,
} = sheetApi();

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

        if (typeof name !== "string" || name.trim() === "") {
          throw new Error("An event name is required.");
        }
        if (Number.isNaN(Date.parse(startTime)) || Number.isNaN(Date.parse(endTime))) {
          throw new Error("startTime and endTime must be valid date-times.");
        }
        if (Date.parse(endTime) <= Date.parse(startTime)) {
          throw new Error("endTime must be after startTime.");
        }
        if (!Number.isFinite(pricingPerHour) || pricingPerHour < 0) {
          throw new Error("pricingPerHour must be a non-negative number.");
        }
        if (!Number.isFinite(capacity) || capacity < 1) {
          throw new Error("capacity must be a positive number.");
        }

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
          throw new Error("The selected event could not be found.");
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

        if (
          !Number.isFinite(updatedEvent.pricingPerHour) ||
          updatedEvent.pricingPerHour < 0
        ) {
          throw new Error("pricingPerHour must be a non-negative number.");
        }
        if (!Number.isFinite(updatedEvent.capacity) || updatedEvent.capacity < 1) {
          throw new Error("capacity must be a positive number.");
        }
        if (
          updatedEvent.startTime !== existingEvent.startTime ||
          updatedEvent.endTime !== existingEvent.endTime
        ) {
          if (
            Number.isNaN(Date.parse(updatedEvent.startTime)) ||
            Number.isNaN(Date.parse(updatedEvent.endTime))
          ) {
            throw new Error("startTime and endTime must be valid date-times.");
          }
          if (Date.parse(updatedEvent.endTime) <= Date.parse(updatedEvent.startTime)) {
            throw new Error("endTime must be after startTime.");
          }
        }

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
        const eventOptions = data.map((event) => ({
          eventId: event.eventId,
          name: event.name,
          startTime: event.startTime,
          endTime: event.endTime,
          pricingPerHour: event.pricingPerHour,
          capacity: event.capacity,
          bookedCustomers: event.bookedCustomers,
          remainingSpots: Math.max(event.capacity - event.bookedCustomers, 0),
          availabilityStatus:
            event.bookedCustomers < event.capacity ? "available" : "full",
        }));
        const summary = eventOptions.length
          ? `Found ${eventOptions.length} event${eventOptions.length === 1 ? "" : "s"}: ${eventOptions
              .map(
                (event) =>
                  `${event.name}, ${event.startTime} to ${event.endTime}, ${event.availabilityStatus}, ${event.remainingSpots} spots remaining, price ${event.pricingPerHour}`,
              )
              .join("; ")}.`
          : `No events found between ${startTime} and ${endTime}.`;

        return {
          ok: true,
          message: "list_events_in_range completed",
          data: {
            summary,
            eventOptions,
            count: data.length,
            selectionRule:
              "Use the exact event name from one matching event option when booking or changing an event. Do not invent IDs.",
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
      message:
        error instanceof Error && error.message
          ? error.message
          : "Event tool failed",
    };
  }
}
