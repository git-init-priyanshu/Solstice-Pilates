export function isPastEventStart(
  startTime: string,
  now: Date = new Date(),
): boolean {
  const parsed = Date.parse(startTime);
  if (Number.isNaN(parsed)) {
    return false;
  }
  return parsed < now.getTime();
}
