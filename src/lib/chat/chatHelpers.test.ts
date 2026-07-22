import assert from "node:assert/strict";
import { test } from "node:test";

import { createCurrentDateContext, createKnownUserContext } from "./chatHelpers";

test("createKnownUserContext returns null for an undefined profile", () => {
  assert.equal(createKnownUserContext(undefined), null);
});

test("createKnownUserContext returns null for an empty profile", () => {
  assert.equal(
    createKnownUserContext({ name: "", email: "", phone: "" }),
    null,
  );
});

test("createKnownUserContext includes only the provided fields", () => {
  const context = createKnownUserContext({
    name: "Ana",
    email: "",
    phone: "555-0100",
  });

  assert.ok(context);
  assert.equal(context.role, "system");
  const content = String(context.content);
  assert.match(content, /name: Ana/);
  assert.match(content, /phone: 555-0100/);
  assert.doesNotMatch(content, /email:/);
});

test("createCurrentDateContext includes the timezone and an ISO-like date", () => {
  process.env.GOOGLE_TIME_ZONE = "America/New_York";

  const context = createCurrentDateContext();
  const content = String(context.content);

  assert.equal(context.role, "system");
  assert.match(content, /America\/New_York/);
  assert.match(content, /\d{4}-\d{2}-\d{2}/);
});
