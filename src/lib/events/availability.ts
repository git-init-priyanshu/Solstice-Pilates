import type { EventRecord } from "@/types/event.types";

export function toEventAvailability(
  event: Pick<EventRecord, "bookedCustomers" | "capacity">,
): { availabilityStatus: "available" | "full"; remainingSpots: number } {
  return {
    remainingSpots: Math.max(event.capacity - event.bookedCustomers, 0),
    availabilityStatus:
      event.bookedCustomers < event.capacity ? "available" : "full",
  };
}
