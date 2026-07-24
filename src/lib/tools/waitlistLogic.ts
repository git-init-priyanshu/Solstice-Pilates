export type BookingAction = "book" | "waitlist";

export function decideBookingAction(
  bookedCustomers: number,
  capacity: number,
): BookingAction {
  return bookedCustomers >= capacity ? "waitlist" : "book";
}

export function nextWaitlistPosition(
  existing: Array<{ position: number }>,
): number {
  return existing.reduce((max, entry) => Math.max(max, entry.position), 0) + 1;
}

export function selectPromotion<T>(
  waitlist: T[],
  bookedCustomers: number,
  capacity: number,
): T | null {
  if (bookedCustomers >= capacity) {
    return null;
  }

  return waitlist.length > 0 ? waitlist[0] : null;
}
