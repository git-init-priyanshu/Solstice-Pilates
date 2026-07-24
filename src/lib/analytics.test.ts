import assert from "node:assert/strict";
import { test } from "node:test";

import { summarizeEvents, type AnalyticsEvent } from "./analytics";

const now = new Date("2026-07-24T12:00:00Z");

function makeEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return {
    name: "Reformer Flow",
    startTime: "2026-08-01T10:00:00Z",
    endTime: "2026-08-01T11:00:00Z",
    pricingPerHour: 20,
    capacity: 10,
    bookedCustomers: 5,
    ...overrides,
  };
}

test("empty list returns zeroed aggregates", () => {
  const summary = summarizeEvents([], now);

  assert.equal(summary.totalEvents, 0);
  assert.equal(summary.totalCapacity, 0);
  assert.equal(summary.totalBooked, 0);
  assert.equal(summary.utilization, 0);
  assert.equal(summary.projectedRevenue, 0);
  assert.deepEqual(summary.events, []);
});

test("mix of past and upcoming events is counted", () => {
  const summary = summarizeEvents(
    [
      makeEvent({ startTime: "2026-01-01T10:00:00Z" }),
      makeEvent({ startTime: "2026-12-01T10:00:00Z" }),
      makeEvent({ startTime: "2026-12-02T10:00:00Z" }),
    ],
    now,
  );

  assert.equal(summary.pastEvents, 1);
  assert.equal(summary.upcomingEvents, 2);
  assert.equal(summary.totalEvents, 3);
});

test("full event counts toward fullEvents and no remaining spots", () => {
  const summary = summarizeEvents(
    [makeEvent({ capacity: 10, bookedCustomers: 10 })],
    now,
  );

  assert.equal(summary.fullEvents, 1);
  assert.equal(summary.openEvents, 0);
  assert.equal(summary.remainingSpots, 0);
  assert.equal(summary.events[0].utilization, 100);
});

test("utilization is rounded to a whole percentage", () => {
  const summary = summarizeEvents(
    [makeEvent({ capacity: 3, bookedCustomers: 1 })],
    now,
  );

  assert.equal(summary.utilization, 33);
  assert.equal(summary.events[0].utilization, 33);
});

test("revenue accounts for fractional hours", () => {
  const summary = summarizeEvents(
    [
      makeEvent({
        startTime: "2026-08-01T10:00:00Z",
        endTime: "2026-08-01T11:30:00Z",
        pricingPerHour: 20,
        bookedCustomers: 4,
      }),
    ],
    now,
  );

  // 1.5 hours * 20 * 4 = 120
  assert.equal(summary.projectedRevenue, 120);
});

test("invalid date-times do not crash aggregation", () => {
  const summary = summarizeEvents(
    [
      makeEvent({ startTime: "not-a-date", endTime: "also-bad" }),
      makeEvent({ endTime: "2026-08-01T09:00:00Z" }),
    ],
    now,
  );

  assert.equal(summary.totalEvents, 2);
  // Neither invalid range contributes revenue.
  assert.equal(summary.projectedRevenue, 0);
  assert.equal(summary.upcomingEvents, 2);
});
