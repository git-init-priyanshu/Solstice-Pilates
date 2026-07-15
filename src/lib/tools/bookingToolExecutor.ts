import { ChatCompletionMessageFunctionToolCall } from "openai/resources.js";

import { useDatabase as sheetApi } from "@/lib/database";
import type { ToolResult, WorkspaceToolContext } from "@/types/tools.types";

const {
  adjustEventBookedCustomers,
  findEventById,
  findEventByName,
  listEventsInRange,
  findUserById,
  getUserBookingDetails,
  upsertUserProfile,
} = sheetApi();

function resolveEventName(args: Record<string, unknown>) {
  const eventName = args["eventName"];

  if (typeof eventName !== "string") {
    return "";
  }

  return eventName.trim();
}

async function resolveEventByName(args: Record<string, unknown>) {
  const eventName = resolveEventName(args);

  if (!eventName) {
    return null;
  }

  return findEventByName(eventName);
}

export async function executeBookingTool(
  toolCall: ChatCompletionMessageFunctionToolCall,
  toolContext: WorkspaceToolContext,
): Promise<ToolResult> {
  try {
    const args = JSON.parse(toolCall.function.arguments || "");

    if (toolCall.function.name === "request_human_handoff") {
      return {
        ok: true,
        message: "request_human_handoff completed",
        intent: "human_handoff",
        data: {
          reason: typeof args["reason"] === "string" ? args["reason"] : "",
        },
      };
    }

    const userId = toolContext.userId;

    if (!userId) {
      throw new Error("A userId is required for booking actions.");
    }

    switch (toolCall.function.name) {
      case "create_user_booking": {
        const customerName = args["customerName"];
        const customerEmail = args["customerEmail"];
        const customerPhone = args["customerPhone"];
        const event = await resolveEventByName(args);
        const confirmedByCustomer = args["confirmedByCustomer"] === true;
        if (!confirmedByCustomer) {
          throw new Error("Customer must explicitly confirm before booking.");
        }

        if (!event) {
          throw new Error(
            "An event name is required. Use the Event sheet lookup result and pass eventName.",
          );
        }

        const existingUser = await findUserById(userId);
        const isSameEvent =
          existingUser?.bookingStatus === "booked" &&
          existingUser.bookedEventId === event.eventId;
        const isGuestBooking =
          isSameEvent &&
          (existingUser?.name !== customerName ||
            existingUser?.email !== customerEmail ||
            existingUser?.phone !== customerPhone);
        if (isSameEvent && !isGuestBooking) {
          throw new Error("The user is already booked into that event.");
        }
        if (event.bookedCustomers >= event.capacity) {
          throw new Error("This event is already full.");
        }

        const bookingUserId = isGuestBooking ? crypto.randomUUID() : userId;
        const updatedEvent = await adjustEventBookedCustomers(event.eventId, 1);
        let session;
        try {
          session = await upsertUserProfile({
            userId: bookingUserId,
            bookedEventId: event.eventId,
            bookingStatus: "booked",
            lastChatSessionId: toolContext.chatId,
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          });
        } catch (error) {
          await adjustEventBookedCustomers(event.eventId, -1);
          throw error;
        }

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
          ...(isGuestBooking
            ? {}
            : {
                userProfile: {
                  email: customerEmail,
                  name: customerName,
                  phone: customerPhone,
                },
              }),
        };
      }

      case "change_user_booking": {
        const event = await resolveEventByName(args);
        const confirmedByCustomer = args["confirmedByCustomer"] === true;

        if (!confirmedByCustomer) {
          throw new Error(
            "Customer must explicitly confirm before changing events.",
          );
        }

        if (!event) {
          throw new Error(
            "An event name is required. Use the Event sheet lookup result and pass eventName.",
          );
        }

        const existingUser = await findUserById(userId);
        const previousBookedEventId =
          existingUser?.bookingStatus === "booked"
            ? existingUser.bookedEventId
            : "";
        if (!previousBookedEventId) {
          throw new Error(
            "The user does not have a current event booking to change.",
          );
        }
        if (previousBookedEventId === event.eventId) {
          throw new Error("The user is already booked into that event.");
        }
        if (event.bookedCustomers >= event.capacity) {
          throw new Error("This event is already full.");
        }

        const previousEvent = await findEventById(previousBookedEventId);

        await adjustEventBookedCustomers(previousBookedEventId, -1);

        let updatedEvent;
        try {
          updatedEvent = await adjustEventBookedCustomers(event.eventId, 1);
        } catch (error) {
          await adjustEventBookedCustomers(previousBookedEventId, 1);
          throw error;
        }

        let session;
        try {
          session = await upsertUserProfile({
            userId,
            bookedEventId: event.eventId,
            bookingStatus: "booked",
            lastChatSessionId: toolContext.chatId,
          });
        } catch (error) {
          await adjustEventBookedCustomers(event.eventId, -1);
          await adjustEventBookedCustomers(previousBookedEventId, 1);
          throw error;
        }

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

      case "cancel_user_booking": {
        const confirmedByCustomer = args["confirmedByCustomer"] === true;

        if (!confirmedByCustomer) {
          throw new Error(
            "Customer must explicitly confirm before cancelling the booking.",
          );
        }

        const existingUser = await findUserById(userId);
        const bookedEventId =
          existingUser?.bookingStatus === "booked"
            ? existingUser.bookedEventId
            : "";
        if (!bookedEventId) {
          throw new Error(
            "The user does not have a current event booking to cancel.",
          );
        }

        const updatedEvent = await adjustEventBookedCustomers(
          bookedEventId,
          -1,
        );

        const session = await upsertUserProfile({
          userId,
          bookedEventId: "",
          bookingStatus: "",
          lastChatSessionId: toolContext.chatId,
        });

        return {
          ok: true,
          message: "cancel_user_booking completed",
          bookingStatus: session.user.bookingStatus,
          data: {
            bookingStatus: session.user.bookingStatus,
            event: updatedEvent,
            user: session.user,
          },
          intent: "booking_cancel",
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

      case "find_alternative_event_options": {
        const startTime = args["startTime"];
        const endTime = args["endTime"];
        const eventName = args["eventName"];
        const booking = await getUserBookingDetails(userId);

        if (!booking?.event) {
          throw new Error(
            "The user does not have a current event booking to change.",
          );
        }

        const targetEventName =
          typeof eventName === "string" && eventName.trim()
            ? eventName.trim()
            : booking.event.name;

        const allEvents = await listEventsInRange({ startTime, endTime });
        const alternatives = allEvents
          .filter(
            (event) =>
              event.name.toLowerCase() === targetEventName.toLowerCase(),
          )
          .filter((event) => event.eventId !== booking.event?.eventId)
          .map((event) => ({
            ...event,
            availabilityStatus:
              event.bookedCustomers < event.capacity ? "available" : "full",
            remainingSpots: Math.max(event.capacity - event.bookedCustomers, 0),
          }));

        return {
          ok: true,
          message: "find_alternative_event_options completed",
          data: {
            alternatives,
            availableAlternatives: alternatives.filter(
              (event) => event.bookedCustomers < event.capacity,
            ),
            targetEventName,
          },
          intent: "booking_change_lookup",
        };
      }

      case "check_booking_guest_capacity": {
        const rawAdditionalGuests = Number(args["additionalGuests"]);
        const additionalGuests = Number.isFinite(rawAdditionalGuests)
          ? rawAdditionalGuests
          : 1;
        const booking = await getUserBookingDetails(userId);

        if (!booking?.event) {
          throw new Error("The user does not have a current event booking.");
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
  } catch {
    return {
      ok: false,
      intent:
        toolCall.function.name === "create_user_booking"
          ? "booking"
          : toolCall.function.name === "change_user_booking"
            ? "booking_change"
            : toolCall.function.name === "cancel_user_booking"
              ? "booking_cancel"
              : toolCall.function.name === "get_user_booking_status"
                ? "booking_status"
                : toolCall.function.name === "find_alternative_event_options"
                  ? "booking_change_lookup"
                  : toolCall.function.name === "check_booking_guest_capacity"
                    ? "booking_guest_capacity"
                    : toolCall.function.name === "request_human_handoff"
                      ? "human_handoff"
                      : undefined,
      message: "Booking tool failed",
    };
  }
}
