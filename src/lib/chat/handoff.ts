const handoffPatterns: RegExp[] = [
  /\brefunds?\b/,
  /\brefunded\b/,
  /\bbilling\b/,
  /\bchargeback\b/,
  /\bcomplaints?\b/,
  /\bwrong price\b/,
  /\bprice issue\b/,
  /\bovercharged\b/,
  /\bdouble charged\b/,
  /\bspeak (to|with) (a )?(person|human|manager|admin|someone|representative|agent)\b/,
  /\btalk (to|with) (a )?(person|human|manager|admin|someone|representative|agent)\b/,
  /\breal (person|human)\b/,
  /\bprivate event\b/,
  /\bsafety (issue|concern)\b/,
  /\bunsafe\b/,
];

export function shouldTriggerHandoff(text: string): boolean {
  if (typeof text !== "string" || !text) {
    return false;
  }

  const normalized = text.toLowerCase();
  return handoffPatterns.some((pattern) => pattern.test(normalized));
}

const assistantBackPatterns: RegExp[] = [
  /\bback to the (assistant|bot)\b/,
  /\btalk to the (assistant|bot)\b/,
  /\bnever ?mind\b/,
  /\bresolved\b/,
  /\bcancel that\b/,
  /\bcontinue with the (assistant|bot)\b/,
  /\bstart over\b/,
];

export function wantsAssistantBack(text: string): boolean {
  if (typeof text !== "string" || !text) {
    return false;
  }

  const normalized = text.toLowerCase();
  return assistantBackPatterns.some((pattern) => pattern.test(normalized));
}
