import type { EventRecord } from "@/types/event.types";

export function filterEventsInRange(
  events: EventRecord[],
  startTime: string,
  endTime: string,
): EventRecord[] {
  const rangeStart = Date.parse(startTime);
  const rangeEnd = Date.parse(endTime);

  if (Number.isNaN(rangeStart) || Number.isNaN(rangeEnd)) {
    throw new Error("startTime and endTime must be valid date-times.");
  }

  if (rangeEnd <= rangeStart) {
    throw new Error("endTime must be after startTime.");
  }

  return events.filter(
    (event) =>
      Date.parse(event.startTime) < rangeEnd &&
      rangeStart < Date.parse(event.endTime),
  );
}
