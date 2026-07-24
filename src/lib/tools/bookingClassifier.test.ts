import { strict as assert } from "node:assert";
import { test } from "node:test";

import { classifyBooking } from "./bookingClassifier";

test("no existing user => not guest, no previous event, not self-rebook", () => {
  const result = classifyBooking({
    existingUser: null,
    event: { eventId: "event-1" },
  });

  assert.deepEqual(result, {
    isGuestBooking: false,
    previousBookedEventId: "",
    isSelfRebookSameEvent: false,
  });
});

test("existing user without an active booking is ignored", () => {
  const result = classifyBooking({
    existingUser: {
      bookingStatus: "cancelled",
      bookedEventId: "event-1",
      name: "Ana",
      email: "ana@example.com",
      phone: "123",
    },
    event: { eventId: "event-1" },
    customerEmail: "someone@example.com",
  });

  assert.deepEqual(result, {
    isGuestBooking: false,
    previousBookedEventId: "",
    isSelfRebookSameEvent: false,
  });
});

test("same identity by email, same event => self-rebook", () => {
  const result = classifyBooking({
    existingUser: {
      bookingStatus: "booked",
      bookedEventId: "event-1",
      name: "Ana",
      email: "ana@example.com",
      phone: "123",
    },
    event: { eventId: "event-1" },
    customerEmail: "ANA@example.com",
  });

  assert.equal(result.isSelfRebookSameEvent, true);
  assert.equal(result.isGuestBooking, false);
  assert.equal(result.previousBookedEventId, "");
});

test("same identity by email, different event => previous event set", () => {
  const result = classifyBooking({
    existingUser: {
      bookingStatus: "booked",
      bookedEventId: "event-1",
      name: "Ana",
      email: "ana@example.com",
      phone: "123",
    },
    event: { eventId: "event-2" },
    customerEmail: "ana@example.com",
  });

  assert.equal(result.isGuestBooking, false);
  assert.equal(result.previousBookedEventId, "event-1");
  assert.equal(result.isSelfRebookSameEvent, false);
});

test("same name and phone when emails are missing => same identity", () => {
  const result = classifyBooking({
    existingUser: {
      bookingStatus: "booked",
      bookedEventId: "event-1",
      name: "Ana",
      email: "",
      phone: "123",
    },
    event: { eventId: "event-2" },
    customerName: "ana",
    customerPhone: "123",
  });

  assert.equal(result.isGuestBooking, false);
  assert.equal(result.previousBookedEventId, "event-1");
});

test("different identity with an active booking => guest booking", () => {
  const result = classifyBooking({
    existingUser: {
      bookingStatus: "booked",
      bookedEventId: "event-1",
      name: "Ana",
      email: "ana@example.com",
      phone: "123",
    },
    event: { eventId: "event-2" },
    customerName: "Bob",
    customerEmail: "bob@example.com",
    customerPhone: "999",
  });

  assert.equal(result.isGuestBooking, true);
  assert.equal(result.previousBookedEventId, "");
  assert.equal(result.isSelfRebookSameEvent, false);
});

test("email match takes precedence over name/phone mismatch", () => {
  const result = classifyBooking({
    existingUser: {
      bookingStatus: "booked",
      bookedEventId: "event-1",
      name: "Ana",
      email: "ana@example.com",
      phone: "123",
    },
    event: { eventId: "event-2" },
    customerName: "Totally Different",
    customerEmail: "ana@example.com",
    customerPhone: "999",
  });

  assert.equal(result.isGuestBooking, false);
  assert.equal(result.previousBookedEventId, "event-1");
});
