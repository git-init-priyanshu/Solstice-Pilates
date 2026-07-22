import type { EventRecord } from "@/types/event.types";
import type { UserProfile } from "@/types/session.types";

type ClassifyBookingInput = {
  existingUser?: Pick<
    UserProfile,
    "bookingStatus" | "bookedEventId" | "name" | "email" | "phone"
  > | null;
  event: Pick<EventRecord, "eventId">;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

export type BookingClassification = {
  isGuestBooking: boolean;
  previousBookedEventId: string;
  isSelfRebookSameEvent: boolean;
};

function normalize(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

function isSameIdentity(
  existingUser: NonNullable<ClassifyBookingInput["existingUser"]>,
  customerName?: string,
  customerEmail?: string,
  customerPhone?: string,
) {
  const userEmail = normalize(existingUser.email);
  const incomingEmail = normalize(customerEmail);

  if (userEmail && incomingEmail) {
    return userEmail === incomingEmail;
  }

  return (
    normalize(existingUser.name) === normalize(customerName) &&
    normalize(existingUser.phone) === normalize(customerPhone)
  );
}

export function classifyBooking({
  existingUser,
  event,
  customerName,
  customerEmail,
  customerPhone,
}: ClassifyBookingInput): BookingClassification {
  const hasActiveBooking = existingUser?.bookingStatus === "booked";

  if (!hasActiveBooking || !existingUser) {
    return {
      isGuestBooking: false,
      previousBookedEventId: "",
      isSelfRebookSameEvent: false,
    };
  }

  const sameIdentity = isSameIdentity(
    existingUser,
    customerName,
    customerEmail,
    customerPhone,
  );
  const isGuestBooking = !sameIdentity;
  const sameEvent = existingUser.bookedEventId === event.eventId;

  return {
    isGuestBooking,
    previousBookedEventId:
      !isGuestBooking && !sameEvent ? existingUser.bookedEventId : "",
    isSelfRebookSameEvent: !isGuestBooking && sameEvent,
  };
}
