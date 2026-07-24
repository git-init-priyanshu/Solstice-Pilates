import assert from "node:assert/strict";
import { test } from "node:test";

import {
  decideBookingAction,
  nextWaitlistPosition,
  selectPromotion,
} from "./waitlistLogic";

test("full event with a confirmed booking resolves to a waitlist action", () => {
  assert.equal(decideBookingAction(10, 10), "waitlist");
  assert.equal(decideBookingAction(11, 10), "waitlist");
});

test("event with open seats resolves to a booking action", () => {
  assert.equal(decideBookingAction(4, 10), "book");
  assert.equal(decideBookingAction(0, 1), "book");
});

test("next waitlist position starts at 1 for an empty list", () => {
  assert.equal(nextWaitlistPosition([]), 1);
});

test("next waitlist position is one past the highest existing position", () => {
  assert.equal(
    nextWaitlistPosition([{ position: 1 }, { position: 2 }, { position: 3 }]),
    4,
  );
  assert.equal(nextWaitlistPosition([{ position: 2 }, { position: 5 }]), 6);
});

test("a freed seat promotes the earliest waitlist entry", () => {
  const waitlist = [
    { id: "a", position: 1 },
    { id: "b", position: 2 },
  ];

  assert.deepEqual(selectPromotion(waitlist, 9, 10), waitlist[0]);
});

test("no promotion when the event is still full", () => {
  const waitlist = [{ id: "a", position: 1 }];

  assert.equal(selectPromotion(waitlist, 10, 10), null);
});

test("no promotion when the waitlist is empty", () => {
  assert.equal(selectPromotion([], 5, 10), null);
});
