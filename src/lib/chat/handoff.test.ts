import assert from "node:assert/strict";
import { test } from "node:test";

import { shouldTriggerHandoff, wantsAssistantBack } from "./handoff";

test("shouldTriggerHandoff triggers on refund and billing language", () => {
  assert.equal(shouldTriggerHandoff("I need a refund please"), true);
  assert.equal(shouldTriggerHandoff("There is a billing problem"), true);
});

test("shouldTriggerHandoff triggers on a chargeback", () => {
  assert.equal(shouldTriggerHandoff("I want to file a chargeback"), true);
});

test("shouldTriggerHandoff triggers on a private event request", () => {
  assert.equal(shouldTriggerHandoff("Can I book a private event?"), true);
});

test("shouldTriggerHandoff triggers on speaking with a manager", () => {
  assert.equal(shouldTriggerHandoff("I want to speak with a manager"), true);
});

test("shouldTriggerHandoff ignores empty and non-string input", () => {
  assert.equal(shouldTriggerHandoff(""), false);
  assert.equal(
    shouldTriggerHandoff(undefined as unknown as string),
    false,
  );
});

test("shouldTriggerHandoff does not trigger on a normal booking question", () => {
  assert.equal(
    shouldTriggerHandoff("Can I book a reformer class tomorrow morning?"),
    false,
  );
});

test("wantsAssistantBack triggers on returning to the assistant", () => {
  assert.equal(wantsAssistantBack("take me back to the assistant"), true);
  assert.equal(wantsAssistantBack("never mind, start over"), true);
});

test("wantsAssistantBack does not trigger on unrelated text", () => {
  assert.equal(wantsAssistantBack("what time does the studio open?"), false);
});
