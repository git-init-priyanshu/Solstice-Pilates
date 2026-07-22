import assert from "node:assert/strict";
import { test } from "node:test";

import { filterEventsInRange } from "./eventRange";
import type { EventRecord } from "@/types/event.types";

function event(overrides: Partial<EventRecord>): EventRecord {
  return {
    eventId: "id",
    name: "Reformer Flow",
    startTime: "2026-07-22T10:00:00.000Z",
    endTime: "2026-07-22T11:00:00.000Z",
    pricingPerHour: 30,
    capacity: 10,
    bookedCustomers: 0,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

const rangeStart = "2026-07-22T10:00:00.000Z";
const rangeEnd = "2026-07-22T12:00:00.000Z";

test("excludes an event ending exactly at rangeStart", () => {
  const events = [
    event({
      eventId: "before",
      startTime: "2026-07-22T09:00:00.000Z",
      endTime: rangeStart,
    }),
  ];

  assert.deepEqual(filterEventsInRange(events, rangeStart, rangeEnd), []);
});

test("excludes an event starting exactly at rangeEnd", () => {
  const events = [
    event({
      eventId: "after",
      startTime: rangeEnd,
      endTime: "2026-07-22T13:00:00.000Z",
    }),
  ];

  assert.deepEqual(filterEventsInRange(events, rangeStart, rangeEnd), []);
});

test("includes a fully-contained event", () => {
  const events = [
    event({
      eventId: "inside",
      startTime: "2026-07-22T10:30:00.000Z",
      endTime: "2026-07-22T11:00:00.000Z",
    }),
  ];

  assert.deepEqual(
    filterEventsInRange(events, rangeStart, rangeEnd).map((e) => e.eventId),
    ["inside"],
  );
});

test("includes an event straddling the range boundary", () => {
  const events = [
    event({
      eventId: "straddle",
      startTime: "2026-07-22T09:30:00.000Z",
      endTime: "2026-07-22T10:30:00.000Z",
    }),
  ];

  assert.deepEqual(
    filterEventsInRange(events, rangeStart, rangeEnd).map((e) => e.eventId),
    ["straddle"],
  );
});

test("throws on an invalid range", () => {
  assert.throws(
    () => filterEventsInRange([], "not-a-date", rangeEnd),
    /valid date-times/,
  );
});

test("throws on a reversed range", () => {
  assert.throws(
    () => filterEventsInRange([], rangeEnd, rangeStart),
    /endTime must be after startTime/,
  );
});
