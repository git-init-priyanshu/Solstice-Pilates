import type { EventRecord } from "@/types/event.types";
import type { WaitlistRecord } from "@/types/waitlist.types";

export function selectNextWaitlistEntry(
  entries: WaitlistRecord[],
): WaitlistRecord | null {
  return (
    entries
      .filter((entry) => entry.status === "waiting")
      .sort(
        (left, right) =>
          Date.parse(left.createdAt) - Date.parse(right.createdAt),
      )[0] ?? null
  );
}

export function hasCapacityForPromotion(
  event: Pick<EventRecord, "bookedCustomers" | "capacity">,
): boolean {
  return event.bookedCustomers < event.capacity;
}
