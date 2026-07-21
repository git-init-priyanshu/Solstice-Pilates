import assert from "node:assert/strict";
import { test } from "node:test";

import { shouldTriggerHandoff, wantsAssistantBack } from "./handoff";

test("benign 'are you human?' does not trigger handoff", () => {
  assert.equal(shouldTriggerHandoff("are you a human?"), false);
});

test("'I want a refund' triggers handoff", () => {
  assert.equal(shouldTriggerHandoff("I want a refund"), true);
});

test("'recharge my membership' does not trigger handoff", () => {
  assert.equal(shouldTriggerHandoff("recharge my membership"), false);
});

test("'discharge' and 'department' do not trigger handoff", () => {
  assert.equal(shouldTriggerHandoff("discharge the department"), false);
});

test("escalation phrases still trigger", () => {
  assert.equal(shouldTriggerHandoff("I have a billing complaint"), true);
  assert.equal(shouldTriggerHandoff("let me speak to a manager"), true);
  assert.equal(shouldTriggerHandoff("I want to book a private event"), true);
  assert.equal(shouldTriggerHandoff("this is a chargeback"), true);
});

test("wantsAssistantBack detects resume phrases", () => {
  assert.equal(wantsAssistantBack("back to the assistant please"), true);
  assert.equal(wantsAssistantBack("let me talk to the bot"), true);
  assert.equal(wantsAssistantBack("never mind"), true);
  assert.equal(wantsAssistantBack("it's resolved now"), true);
  assert.equal(wantsAssistantBack("cancel that"), true);
});

test("wantsAssistantBack ignores unrelated text", () => {
  assert.equal(wantsAssistantBack("what classes are on tomorrow?"), false);
});
