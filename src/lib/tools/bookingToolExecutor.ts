import { ChatCompletionMessageFunctionToolCall } from "openai/resources.js";

import { useSheet } from "@/hooks/useSheet";
import type { ToolResult, WorkspaceToolContext } from "@/types/tools.types";

const {
  adjustEventBookedCustomers,
  findEventById,
  listEventsInRange,
  findUserById,
  getUserBookingDetails,
  upsertUserProfile,
} = useSheet();

export async function executeBookingTool(
  toolCall: ChatCompletionMessageFunctionToolCall,
  toolContext: WorkspaceToolContext,
): Promise<ToolResult> {
  try {
    const args = JSON.parse(toolCall.function.arguments || "");
    const userId = toolContext.userId;

    if (!userId) {
      throw new Error("A userId is required for booking actions.");
    }

    switch (toolCall.function.name) {
      case "create_user_booking": {
        const customerName = args["customerName"];
        const customerEmail = args["customerEmail"];
        const customerPhone = args["customerPhone"];
        const eventId = args["eventId"];
        const confirmedByCustomer = args["confirmedByCustomer"] === true;
        if (!confirmedByCustomer) {
          throw new Error("Customer must explicitly confirm before booking.");
        }

        const event = await findEventById(eventId);
        if (!event) {
          throw new Error("The selected class event could not be found.");
        }
        const existingUser = await findUserById(userId);
        if (
          existingUser?.bookingStatus === "booked" &&
          existingUser.bookedEventId === event.eventId
        ) {
          throw new Error("The user is already booked into that class.");
        }
        if (event.bookedCustomers >= event.capacity) {
          throw new Error("This class is already full.");
        }

        const updatedEvent = await adjustEventBookedCustomers(event.eventId, 1);
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
            bookingStatus: "booked",
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

      case "change_user_booking": {
        const eventId = args["eventId"];
        const confirmedByCustomer = args["confirmedByCustomer"] === true;

        if (!confirmedByCustomer) {
          throw new Error(
            "Customer must explicitly confirm before changing classes.",
          );
        }

        const selectedEvent = await findEventById(eventId);
        if (!selectedEvent) {
          throw new Error("The selected class event could not be found.");
        }

        const existingUser = await findUserById(userId);
        const previousBookedEventId =
          existingUser?.bookingStatus === "booked"
            ? existingUser.bookedEventId
            : "";
        if (!previousBookedEventId) {
          throw new Error(
            "The user does not have a current class booking to change.",
          );
        }
        if (previousBookedEventId === selectedEvent.eventId) {
          throw new Error("The user is already booked into that class.");
        }
        if (selectedEvent.bookedCustomers >= selectedEvent.capacity) {
          throw new Error("This class is already full.");
        }

        const previousEvent = await findEventById(previousBookedEventId);

        await adjustEventBookedCustomers(previousBookedEventId, -1);
        const updatedEvent = await adjustEventBookedCustomers(
          selectedEvent.eventId,
          1,
        );

        const session = await upsertUserProfile({
          userId,
          bookedEventId: selectedEvent.eventId,
          bookingStatus: "booked",
          lastChatSessionId: toolContext.chatId,
        });

        return {
          ok: true,
          message: "change_user_booking completed",
          bookingStatus: "booked",
          data: {
            bookingStatus: session.user.bookingStatus,
            event: updatedEvent,
            previousEvent,
            user: session.user,
          },
          intent: "booking_change",
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
            user: booking.user,
          },
          intent: "booking_status",
        };
      }

      case "find_alternative_class_options": {
        const startTime = args["startTime"];
        const endTime = args["endTime"];
        const className = args["className"];
        const booking = await getUserBookingDetails(userId);

        if (!booking?.event) {
          throw new Error(
            "The user does not have a current class booking to change.",
          );
        }

        const alternatives = (await listEventsInRange({ startTime, endTime }))
          .filter(
            (event) =>
              event.eventId !== booking.event?.eventId &&
              event.name === className,
          )
          .map((event) => ({
            ...event,
            availabilityStatus:
              event.bookedCustomers < event.capacity ? "available" : "full",
            remainingSpots: Math.max(event.capacity - event.bookedCustomers, 0),
          }));

        return {
          ok: true,
          message: "find_alternative_class_options completed",
          data: {
            alternatives,
            availableAlternatives: alternatives.filter(
              (event) => event.bookedCustomers < event.capacity,
            ),
            targetClassName: className,
          },
          intent: "booking_change_lookup",
        };
      }

      case "check_booking_guest_capacity": {
        const additionalGuests = Number(args["additionalGuests"]);
        const booking = await getUserBookingDetails(userId);

        if (!booking?.event) {
          throw new Error("The user does not have a current class booking.");
        }

        const remainingSpots = Math.max(
          booking.event.capacity - booking.event.bookedCustomers,
          0,
        );

        return {
          ok: true,
          message: "check_booking_guest_capacity completed",
          data: {
            additionalGuests,
            canAccommodate: remainingSpots >= additionalGuests,
            currentEvent: booking.event,
            remainingSpots,
          },
          intent: "booking_guest_capacity",
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
      intent:
        toolCall.function.name === "create_user_booking"
          ? "booking"
          : toolCall.function.name === "change_user_booking"
            ? "booking_change"
            : toolCall.function.name === "get_user_booking_status"
              ? "booking_status"
              : toolCall.function.name === "find_alternative_class_options"
                ? "booking_change_lookup"
                : toolCall.function.name === "check_booking_guest_capacity"
                  ? "booking_guest_capacity"
                  : undefined,
      message: "Booking tool failed",
    };
  }
}
