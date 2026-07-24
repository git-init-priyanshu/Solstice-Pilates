const HANDOFF_SUMMARY_PREFIX = "Handoff reason:";

/**
 * Decide the conversationSummary to persist for a transcript snapshot without
 * clobbering a handoff reason set during an earlier tool-call webhook.
 *
 * Keeps an existing "Handoff reason: ..." summary; otherwise falls back to the
 * transcript when it is non-empty, and finally to the existing summary.
 */
export function resolveTranscriptSummary(
  existingSummary: string | null | undefined,
  transcript: string | null | undefined,
): string | undefined {
  if (existingSummary?.startsWith(HANDOFF_SUMMARY_PREFIX)) {
    return existingSummary;
  }

  if (typeof transcript === "string" && transcript.trim()) {
    return transcript;
  }

  return existingSummary ?? undefined;
}
