import { strict as assert } from "node:assert";
import { test } from "node:test";

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import {
  createCurrentDateContext,
  createKnownUserContext,
  getLatestUserMessage,
} from "./chatHelpers";

test("getLatestUserMessage returns the last user message content", () => {
  const messages = [
    { role: "user" as const, content: "first" },
    { role: "assistant" as const, content: "reply" },
    { role: "user" as const, content: "second" },
  ];

  assert.equal(getLatestUserMessage(messages), "second");
});

test("getLatestUserMessage returns empty string when no user message", () => {
  assert.equal(getLatestUserMessage([]), "");
  assert.equal(
    getLatestUserMessage([{ role: "assistant", content: "hi" }]),
    "",
  );
});

test("createKnownUserContext returns null without a profile", () => {
  assert.equal(createKnownUserContext(undefined), null);
});

test("createKnownUserContext returns null when no details are present", () => {
  assert.equal(
    createKnownUserContext({ name: "", email: "", phone: "" }),
    null,
  );
});

test("createKnownUserContext builds a system message with provided fields", () => {
  const context = createKnownUserContext({
    name: "Ana",
    email: "ana@example.com",
    phone: "555-0100",
  }) as ChatCompletionMessageParam;

  assert.equal(context.role, "system");
  const content = String(context.content);
  assert.match(content, /name: Ana/);
  assert.match(content, /email: ana@example.com/);
  assert.match(content, /phone: 555-0100/);
});

test("createCurrentDateContext reports the configured timezone", () => {
  const previous = process.env.GOOGLE_TIME_ZONE;
  process.env.GOOGLE_TIME_ZONE = "America/New_York";

  try {
    const context = createCurrentDateContext();

    assert.equal(context.role, "system");
    assert.match(context.content, /America\/New_York/);
  } finally {
    if (previous === undefined) {
      delete process.env.GOOGLE_TIME_ZONE;
    } else {
      process.env.GOOGLE_TIME_ZONE = previous;
    }
  }
});
