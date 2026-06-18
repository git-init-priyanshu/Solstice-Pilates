import { ChatCompletionMessageFunctionToolCall } from "openai/resources.js";

import { createCalendarClient } from "@/hooks/useCalendar";
import { createSheetClient } from "@/hooks/useSheet";
import type {
  ToolArgs,
  ToolResult,
  WorkspaceToolContext,
} from "@/types/tools.types";

const {
  cancelCalendarEvent,
  checkCalendarAvailability,
  getCalendarId,
  requireGoogleAccessToken,
  rescheduleCalendarEvent,
  scheduleCalendarEvent,
} = createCalendarClient();

const { logConversationToSheet } = createSheetClient();

export async function executeCalendarTool(
  toolCall: ChatCompletionMessageFunctionToolCall,
  context: WorkspaceToolContext = {},
): Promise<ToolResult> {
  try {
    const accessToken = await requireGoogleAccessToken();
    const args = toolCall.function.arguments
      ? (JSON.parse(toolCall.function.arguments) as ToolArgs)
      : {};

    switch (toolCall.function.name) {
      case "check_calendar_availability": {
        const timeMin = args["timeMin"] as string;
        const timeMax = args["timeMax"] as string;

        const data = await checkCalendarAvailability({
          accessToken,
          calendarId: getCalendarId(),
          timeMin,
          timeMax,
        });

        return {
          ok: true,
          message: "check_calendar_availability completed",
          data,
        };
      }

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
        const busy = await checkCalendarAvailability({
          accessToken,
          calendarId: getCalendarId(),
          timeMin: startDateTime,
          timeMax: endDateTime,
        });

        if (busy.length > 0) {
          return {
            ok: false,
            message: "The requested time is not available.",
            data: {
              available: false,
              busy,
            },
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

        await logConversationToSheet({
          assistantReply: `${classType} booked for ${customerName}`,
          bookingStatus: "booked",
          chatId: context.chatId,
          customerEmail: args["customerEmail"] as string,
          customerName,
          customerPhone,
          intent: "booking",
          toolsUsed: ["schedule_calendar_event"],
          userId: context.userId,
          userMessage: `${customerName} booking request`,
        });

        return {
          ok: true,
          message: "schedule_calendar_event completed",
          data,
        };
      }

      case "reschedule_calendar_event": {
        const customerName = args["customerName"] as string;
        const customerPhone = args["customerPhone"] as string;
        const confirmedByCustomer = args["confirmedByCustomer"] === true;

        if (!confirmedByCustomer) {
          throw new Error(
            "Customer must explicitly confirm before rescheduling",
          );
        }

        const eventId = args["eventId"] as string;
        const startDateTime = args["startDateTime"] as string;
        const endDateTime = args["endDateTime"] as string;
        const busy = await checkCalendarAvailability({
          accessToken,
          calendarId: getCalendarId(),
          timeMin: startDateTime,
          timeMax: endDateTime,
        });

        if (busy.length > 0) {
          return {
            ok: false,
            message: "The requested time is not available.",
            data: {
              available: false,
              busy,
            },
          };
        }

        const data = await rescheduleCalendarEvent({
          accessToken,
          calendarId: getCalendarId(),
          eventId,
          startDateTime,
          endDateTime,
        });

        await logConversationToSheet({
          assistantReply: `${eventId} rescheduled for ${customerName} (${customerPhone})`,
          bookingStatus: "rescheduled",
          chatId: context.chatId,
          customerName,
          customerPhone,
          intent: "reschedule",
          toolsUsed: ["reschedule_calendar_event"],
          userId: context.userId,
          userMessage: `${customerName} reschedule request`,
        });

        return {
          ok: true,
          message: "reschedule_calendar_event completed",
          data,
        };
      }

      case "cancel_calendar_event": {
        const eventId = args["eventId"] as string;
        const data = await cancelCalendarEvent({
          accessToken,
          calendarId: getCalendarId(),
          eventId,
        });

        await logConversationToSheet({
          assistantReply: `Cancelled calendar event ${eventId}`,
          bookingStatus: "cancelled",
          chatId: context.chatId,
          intent: "cancellation",
          toolsUsed: ["cancel_calendar_event"],
          userId: context.userId,
          userMessage: `Cancel request for ${eventId}`,
        });

        return {
          ok: true,
          message: "cancel_calendar_event completed",
          data: data ?? { cancelled: true, eventId },
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
      message: error instanceof Error ? error.message : "Calendar tool failed",
    };
  }
}
