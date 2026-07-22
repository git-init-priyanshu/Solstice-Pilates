import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyBooking } from "@/lib/tools/bookingClassifier";
import type { UserProfile } from "@/types/session.types";

const bookedUser: UserProfile = {
  userId: "user-1",
  name: "Alice",
  email: "alice@example.com",
  phone: "1111111111",
  bookingStatus: "booked",
  bookedEventId: "event-a",
  lastChatSessionId: "chat-1",
  createdAt: "2026-01-01T00:00:00Z",
  role: "user",
};

test("same identity re-booking the same event is flagged as self-rebook", () => {
  const result = classifyBooking({
    existingUser: bookedUser,
    event: { eventId: "event-a" },
    customerName: "Alice",
    customerEmail: "alice@example.com",
    customerPhone: "1111111111",
  });

  assert.equal(result.isSelfRebookSameEvent, true);
  assert.equal(result.isGuestBooking, false);
  assert.equal(result.previousBookedEventId, "");
});

test("same identity booking a different event moves the booking", () => {
  const result = classifyBooking({
    existingUser: bookedUser,
    event: { eventId: "event-b" },
    customerName: "Alice",
    customerEmail: "ALICE@example.com",
    customerPhone: "1111111111",
  });

  assert.equal(result.isGuestBooking, false);
  assert.equal(result.isSelfRebookSameEvent, false);
  assert.equal(result.previousBookedEventId, "event-a");
});

test("booking a friend into the same event is a guest booking", () => {
  const result = classifyBooking({
    existingUser: bookedUser,
    event: { eventId: "event-a" },
    customerName: "Bob",
    customerEmail: "bob@example.com",
    customerPhone: "2222222222",
  });

  assert.equal(result.isGuestBooking, true);
  assert.equal(result.isSelfRebookSameEvent, false);
  assert.equal(result.previousBookedEventId, "");
});

test("booking a friend into a different event leaves the primary event untouched", () => {
  const result = classifyBooking({
    existingUser: bookedUser,
    event: { eventId: "event-b" },
    customerName: "Bob",
    customerEmail: "bob@example.com",
    customerPhone: "2222222222",
  });

  assert.equal(result.isGuestBooking, true);
  assert.equal(result.isSelfRebookSameEvent, false);
  assert.equal(result.previousBookedEventId, "");
});

test("an unbooked user booking is a normal booking", () => {
  const result = classifyBooking({
    existingUser: {
      ...bookedUser,
      bookingStatus: "",
      bookedEventId: "",
    },
    event: { eventId: "event-a" },
    customerName: "Alice",
    customerEmail: "alice@example.com",
    customerPhone: "1111111111",
  });

  assert.equal(result.isGuestBooking, false);
  assert.equal(result.isSelfRebookSameEvent, false);
  assert.equal(result.previousBookedEventId, "");
});
