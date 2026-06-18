import { ChatCompletionMessageFunctionToolCall } from "openai/resources.js";

import { createCalendarClient } from "@/hooks/useCalendar";
import type { CalendarListEvent } from "@/types/calendar.types";
import type { ToolArgs, ToolResult } from "@/types/tools.types";

const {
  cancelCalendarEvent,
  getCalendarId,
  listCalendarEvents,
  requireGoogleAccessToken,
  rescheduleCalendarEvent,
  scheduleCalendarEvent,
} = createCalendarClient();

function getIntentForTool(name: string) {
  switch (name) {
    case "schedule_calendar_event":
      return "booking";
    case "reschedule_calendar_event":
      return "reschedule";
    case "cancel_calendar_event":
      return "cancellation";
    default:
      return undefined;
  }
}

function getFailedStatus(name: string) {
  switch (name) {
    case "schedule_calendar_event":
    case "reschedule_calendar_event":
    case "cancel_calendar_event":
      return "failed";
    default:
      return undefined;
  }
}

function toTimestamp(value?: string) {
  if (!value) {
    return Number.NaN;
  }

  return Date.parse(value);
}

function getEventStart(event: CalendarListEvent) {
  return event.start?.dateTime || event.start?.date || "";
}

function getEventEnd(event: CalendarListEvent) {
  return event.end?.dateTime || event.end?.date || "";
}

function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) {
  return startA < endB && startB < endA;
}

async function findCalendarConflicts({
  accessToken,
  calendarId,
  excludeEventId,
  timeMax,
  timeMin,
}: {
  accessToken: string;
  calendarId: string;
  excludeEventId?: string;
  timeMax: string;
  timeMin: string;
}) {
  const requestedStart = toTimestamp(timeMin);
  const requestedEnd = toTimestamp(timeMax);

  if (Number.isNaN(requestedStart) || Number.isNaN(requestedEnd)) {
    throw new Error("Booking conflict check requires valid RFC3339 timestamps.");
  }

  const events = await listCalendarEvents({
    accessToken,
    calendarId,
    timeMin,
    timeMax,
  });

  return events.filter((event) => {
    if (event.status === "cancelled") {
      return false;
    }

    if (excludeEventId && event.id === excludeEventId) {
      return false;
    }

    const eventStart = toTimestamp(getEventStart(event));
    const eventEnd = toTimestamp(getEventEnd(event));

    if (Number.isNaN(eventStart) || Number.isNaN(eventEnd)) {
      return false;
    }

    return rangesOverlap(requestedStart, requestedEnd, eventStart, eventEnd);
  });
}

export async function executeCalendarTool(
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolResult> {
  try {
    const accessToken = await requireGoogleAccessToken();
    const args = toolCall.function.arguments
      ? (JSON.parse(toolCall.function.arguments) as ToolArgs)
      : {};

    switch (toolCall.function.name) {
      case "schedule_calendar_event": {
        const customerName = args["customerName"] as string;
        const customerPhone = args["customerPhone"] as string;
        const confirmedByCustomer = args["confirmedByCustomer"] === true;

        if (!confirmedByCustomer) {
          throw new Error("Customer must explicitly confirm before booking");
        }

        const classType = args["classType"] as string;
        const startDateTime = args["startDateTime"] as string;
        const endDateTime = args["endDateTime"] as string;
        const conflicts = await findCalendarConflicts({
          accessToken,
          calendarId: getCalendarId(),
          timeMin: startDateTime,
          timeMax: endDateTime,
        });

        if (conflicts.length > 0) {
          return {
            ok: false,
            message: "The requested time is not available.",
            data: {
              available: false,
              conflicts,
            },
            bookingStatus: "unavailable",
            intent: "booking",
          };
        }

        const data = await scheduleCalendarEvent({
          accessToken,
          calendarId: getCalendarId(),
          summary: `${classType} - ${customerName}`,
          startDateTime,
          endDateTime,
          attendeeEmail: args["customerEmail"] as string,
          description: `Booked by Solstice Pilates AI receptionist. Phone: ${customerPhone}`,
        });

        return {
          ok: true,
          message: "schedule_calendar_event completed",
          data,
          bookingStatus: "booked",
          intent: "booking",
          userProfile: {
            email: (args["customerEmail"] as string) || undefined,
            name: customerName,
            phone: customerPhone,
          },
        };
      }

      case "reschedule_calendar_event": {
        const confirmedByCustomer = args["confirmedByCustomer"] === true;

        if (!confirmedByCustomer) {
          throw new Error(
            "Customer must explicitly confirm before rescheduling",
          );
        }

        const eventId = args["eventId"] as string;
        const startDateTime = args["startDateTime"] as string;
        const endDateTime = args["endDateTime"] as string;
        const conflicts = await findCalendarConflicts({
          accessToken,
          calendarId: getCalendarId(),
          excludeEventId: eventId,
          timeMin: startDateTime,
          timeMax: endDateTime,
        });

        if (conflicts.length > 0) {
          return {
            ok: false,
            message: "The requested time is not available.",
            data: {
              available: false,
              conflicts,
            },
            bookingStatus: "unavailable",
            intent: "reschedule",
          };
        }

        const data = await rescheduleCalendarEvent({
          accessToken,
          calendarId: getCalendarId(),
          eventId,
          startDateTime,
          endDateTime,
        });

        return {
          ok: true,
          message: "reschedule_calendar_event completed",
          data,
          bookingStatus: "rescheduled",
          intent: "reschedule",
          userProfile: {
            email: (args["customerEmail"] as string) || undefined,
            name: (args["customerName"] as string) || undefined,
            phone: (args["customerPhone"] as string) || undefined,
          },
        };
      }

      case "cancel_calendar_event": {
        const eventId = args["eventId"] as string;
        const data = await cancelCalendarEvent({
          accessToken,
          calendarId: getCalendarId(),
          eventId,
        });

        return {
          ok: true,
          message: "cancel_calendar_event completed",
          data: data ?? { cancelled: true, eventId },
          bookingStatus: "cancelled",
          intent: "cancellation",
        };
      }

      default:
        return {
          ok: false,
          message: `Unknown calendar tool: ${toolCall.function.name}`,
        };
    }
  } catch (error) {
    return {
      ok: false,
      bookingStatus: getFailedStatus(toolCall.function.name),
      intent: getIntentForTool(toolCall.function.name),
      message: error instanceof Error ? error.message : "Calendar tool failed",
    };
  }
}
