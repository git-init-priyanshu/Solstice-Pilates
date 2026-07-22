import assert from "node:assert/strict";
import { test } from "node:test";

import {
  hasCapacityForPromotion,
  selectNextWaitlistEntry,
} from "./waitlist";
import type { WaitlistRecord } from "@/types/waitlist.types";

function entry(overrides: Partial<WaitlistRecord>): WaitlistRecord {
  return {
    entryId: "id",
    eventId: "event",
    userId: "user",
    name: "",
    email: "",
    phone: "",
    status: "waiting",
    createdAt: "2026-07-22T10:00:00.000Z",
    ...overrides,
  };
}

test("selectNextWaitlistEntry returns the oldest waiting entry", () => {
  const entries = [
    entry({ entryId: "b", createdAt: "2026-07-22T11:00:00.000Z" }),
    entry({ entryId: "a", createdAt: "2026-07-22T09:00:00.000Z" }),
    entry({ entryId: "c", createdAt: "2026-07-22T10:00:00.000Z" }),
  ];

  assert.equal(selectNextWaitlistEntry(entries)?.entryId, "a");
});

test("selectNextWaitlistEntry ignores non-waiting entries", () => {
  const entries = [
    entry({ entryId: "a", status: "promoted", createdAt: "2026-07-22T08:00:00.000Z" }),
    entry({ entryId: "b", status: "waiting", createdAt: "2026-07-22T12:00:00.000Z" }),
  ];

  assert.equal(selectNextWaitlistEntry(entries)?.entryId, "b");
});

test("selectNextWaitlistEntry returns null when nothing is waiting", () => {
  assert.equal(selectNextWaitlistEntry([]), null);
  assert.equal(
    selectNextWaitlistEntry([entry({ status: "promoted" })]),
    null,
  );
});

test("hasCapacityForPromotion is true only when a seat is open", () => {
  assert.equal(hasCapacityForPromotion({ bookedCustomers: 4, capacity: 5 }), true);
  assert.equal(hasCapacityForPromotion({ bookedCustomers: 5, capacity: 5 }), false);
  assert.equal(hasCapacityForPromotion({ bookedCustomers: 6, capacity: 5 }), false);
});
