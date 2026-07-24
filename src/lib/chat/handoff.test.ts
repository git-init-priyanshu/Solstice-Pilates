import { strict as assert } from "node:assert";
import { test } from "node:test";

import { shouldTriggerHandoff, wantsAssistantBack } from "./handoff";

test("shouldTriggerHandoff matches escalation phrases", () => {
  const triggers = [
    "I want a refund please",
    "there is a billing problem",
    "I need to file a chargeback",
    "can I speak to a human",
    "we want to book a private event",
    "this feels unsafe",
  ];

  for (const text of triggers) {
    assert.equal(shouldTriggerHandoff(text), true, text);
  }
});

test("shouldTriggerHandoff ignores ordinary questions", () => {
  assert.equal(shouldTriggerHandoff("what classes do you have"), false);
  assert.equal(shouldTriggerHandoff("book me a pilates class tomorrow"), false);
});

test("shouldTriggerHandoff guards empty and non-string input", () => {
  assert.equal(shouldTriggerHandoff(""), false);
  assert.equal(shouldTriggerHandoff(undefined as unknown as string), false);
  assert.equal(shouldTriggerHandoff(null as unknown as string), false);
  assert.equal(shouldTriggerHandoff(42 as unknown as string), false);
});

test("wantsAssistantBack matches return phrases", () => {
  const triggers = [
    "let's go back to the assistant",
    "never mind",
    "that is resolved now",
  ];

  for (const text of triggers) {
    assert.equal(wantsAssistantBack(text), true, text);
  }
});

test("wantsAssistantBack ignores unrelated text", () => {
  assert.equal(wantsAssistantBack("I still need help with billing"), false);
});

test("wantsAssistantBack guards empty and non-string input", () => {
  assert.equal(wantsAssistantBack(""), false);
  assert.equal(wantsAssistantBack(undefined as unknown as string), false);
  assert.equal(wantsAssistantBack(null as unknown as string), false);
});
