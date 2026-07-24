import assert from "node:assert/strict";
import { test } from "node:test";

import { isPastEventStart } from "./eventTime";

const now = new Date("2026-07-24T12:00:00Z");

test("past start returns true", () => {
  assert.equal(isPastEventStart("2026-07-24T11:00:00Z", now), true);
});

test("future start returns false", () => {
  assert.equal(isPastEventStart("2026-07-24T13:00:00Z", now), false);
});

test("exact-now boundary returns false", () => {
  assert.equal(isPastEventStart("2026-07-24T12:00:00Z", now), false);
});

test("unparseable input returns false", () => {
  assert.equal(isPastEventStart("not-a-date", now), false);
});
