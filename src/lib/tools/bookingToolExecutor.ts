import { ChatCompletionMessageFunctionToolCall } from "openai/resources.js";

import { createSheetClient } from "@/hooks/useSheet";
import type { ToolArgs, ToolResult, WorkspaceToolContext } from "@/types/tools.types";

const {
  adjustEventBookedCustomers,
  findEventById,
  findUserById,
  getUserBookingDetails,
  upsertUserProfile,
} = createSheetClient();

function getIntentForTool(name: string) {
  switch (name) {
    case "create_user_booking":
      return "booking";
    case "get_user_booking_status":
      return "booking_status";
    default:
      return undefined;
  }
}

export async function executeBookingTool(
  toolCall: ChatCompletionMessageFunctionToolCall,
  toolContext: WorkspaceToolContext,
): Promise<ToolResult> {
  try {
    const args = toolCall.function.arguments
      ? (JSON.parse(toolCall.function.arguments) as ToolArgs)
      : {};
    const userId = toolContext.userId;

    if (!userId) {
      throw new Error("A userId is required for booking actions.");
    }

    switch (toolCall.function.name) {
      case "create_user_booking": {
        const confirmedByCustomer = args["confirmedByCustomer"] === true;

        if (!confirmedByCustomer) {
          throw new Error("Customer must explicitly confirm before booking.");
        }

        const eventId = args["eventId"] as string;
        const event = await findEventById(eventId);

        if (!event) {
          throw new Error("The selected class event could not be found.");
        }

        if (event.bookedCustomers >= event.capacity) {
          throw new Error("This class is already full.");
        }

        const customerName = args["customerName"] as string;
        const customerEmail = args["customerEmail"] as string;
        const customerPhone = args["customerPhone"] as string;
        const existingUser = await findUserById(userId);
        const previousBookedEventId =
          existingUser?.bookingStatus === "booked"
            ? existingUser.bookedEventId
            : "";
        let updatedEvent = event;

        if (previousBookedEventId && previousBookedEventId !== event.eventId) {
          await adjustEventBookedCustomers(previousBookedEventId, -1);
        }

        if (!previousBookedEventId || previousBookedEventId !== event.eventId) {
          updatedEvent = await adjustEventBookedCustomers(event.eventId, 1);
        }

        const session = await upsertUserProfile({
          userId,
          bookedEventId: event.eventId,
          bookingStatus: "booked",
          lastChatSessionId: toolContext.chatId,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        });

        return {
          ok: true,
          message: "create_user_booking completed",
          bookingStatus: "booked",
          data: {
            bookingStatus: session.user.bookingStatus,
            event: updatedEvent,
            user: session.user,
          },
          intent: "booking",
          userProfile: {
            email: customerEmail,
            name: customerName,
            phone: customerPhone,
          },
        };
      }

      case "get_user_booking_status": {
        const booking = await getUserBookingDetails(userId);

        if (!booking) {
          throw new Error("The user profile could not be found.");
        }

        return {
          ok: true,
          message: "get_user_booking_status completed",
          bookingStatus: booking.user.bookingStatus || "not_booked",
          data: {
            bookedEventId: booking.user.bookedEventId,
            bookingStatus: booking.user.bookingStatus || "not_booked",
            event: booking.event,
            hasBooking: Boolean(booking.user.bookedEventId),
            pricingPerHour: booking.event?.pricingPerHour,
            availabilityStatus:
              booking.event && booking.event.bookedCustomers < booking.event.capacity
                ? "available"
                : booking.event
                  ? "full"
                  : undefined,
            user: booking.user,
          },
          intent: "booking_status",
        };
      }

      default:
        return {
          ok: false,
          message: `Unknown booking tool: ${toolCall.function.name}`,
        };
    }
  } catch (error) {
    return {
      ok: false,
      intent: getIntentForTool(toolCall.function.name),
      message: error instanceof Error ? error.message : "Booking tool failed",
    };
  }
}
