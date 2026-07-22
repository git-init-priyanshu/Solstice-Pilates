import assert from "node:assert/strict";
import { test } from "node:test";

import { toEventAvailability } from "./availability";

test("marks the event available when booked is below capacity", () => {
  assert.deepEqual(toEventAvailability({ bookedCustomers: 3, capacity: 10 }), {
    availabilityStatus: "available",
    remainingSpots: 7,
  });
});

test("marks the event full when booked equals capacity", () => {
  assert.deepEqual(toEventAvailability({ bookedCustomers: 5, capacity: 5 }), {
    availabilityStatus: "full",
    remainingSpots: 0,
  });
});

test("clamps remainingSpots at zero when overbooked", () => {
  assert.deepEqual(toEventAvailability({ bookedCustomers: 8, capacity: 5 }), {
    availabilityStatus: "full",
    remainingSpots: 0,
  });
});
