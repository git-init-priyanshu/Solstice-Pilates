import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveTranscriptSummary } from "./vapiHelpers";

test("keeps an existing handoff reason over a transcript", () => {
  assert.equal(
    resolveTranscriptSummary("Handoff reason: refund request", "call transcript"),
    "Handoff reason: refund request",
  );
});

test("uses the transcript when no summary is stored", () => {
  assert.equal(
    resolveTranscriptSummary("", "call transcript"),
    "call transcript",
  );
  assert.equal(
    resolveTranscriptSummary(null, "call transcript"),
    "call transcript",
  );
});

test("replaces a previous transcript with the new transcript", () => {
  assert.equal(
    resolveTranscriptSummary("old transcript", "new transcript"),
    "new transcript",
  );
});

test("keeps the existing summary when the transcript is empty", () => {
  assert.equal(resolveTranscriptSummary("old transcript", ""), "old transcript");
  assert.equal(
    resolveTranscriptSummary("Handoff reason: billing", undefined),
    "Handoff reason: billing",
  );
});

test("returns undefined when nothing is available", () => {
  assert.equal(resolveTranscriptSummary("", ""), undefined);
  assert.equal(resolveTranscriptSummary(undefined, undefined), undefined);
});
