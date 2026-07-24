import { strict as assert } from "node:assert";
import { test } from "node:test";

import { eventOverlapsRange } from "./database";

const rangeStart = Date.parse("2026-07-10T00:00:00Z");
const rangeEnd = Date.parse("2026-07-20T00:00:00Z");

function event(startTime: string, endTime: string) {
  return { startTime, endTime };
}

test("event entirely before the window is excluded", () => {
  assert.equal(
    eventOverlapsRange(
      event("2026-07-01T09:00:00Z", "2026-07-01T10:00:00Z"),
      rangeStart,
      rangeEnd,
    ),
    false,
  );
});

test("event entirely after the window is excluded", () => {
  assert.equal(
    eventOverlapsRange(
      event("2026-07-25T09:00:00Z", "2026-07-25T10:00:00Z"),
      rangeStart,
      rangeEnd,
    ),
    false,
  );
});

test("event overlapping the start edge is included", () => {
  assert.equal(
    eventOverlapsRange(
      event("2026-07-09T23:00:00Z", "2026-07-10T01:00:00Z"),
      rangeStart,
      rangeEnd,
    ),
    true,
  );
});

test("event overlapping the end edge is included", () => {
  assert.equal(
    eventOverlapsRange(
      event("2026-07-19T23:00:00Z", "2026-07-20T01:00:00Z"),
      rangeStart,
      rangeEnd,
    ),
    true,
  );
});

test("event fully inside the window is included", () => {
  assert.equal(
    eventOverlapsRange(
      event("2026-07-15T09:00:00Z", "2026-07-15T10:00:00Z"),
      rangeStart,
      rangeEnd,
    ),
    true,
  );
});

test("event ending exactly at the window start is excluded", () => {
  assert.equal(
    eventOverlapsRange(
      event("2026-07-09T23:00:00Z", "2026-07-10T00:00:00Z"),
      rangeStart,
      rangeEnd,
    ),
    false,
  );
});

test("event starting exactly at the window end is excluded", () => {
  assert.equal(
    eventOverlapsRange(
      event("2026-07-20T00:00:00Z", "2026-07-20T01:00:00Z"),
      rangeStart,
      rangeEnd,
    ),
    false,
  );
});
