export const FAILURES_PER_HINT = 3;

export function hintProgress(failedAttempts: number, totalHints = 3) {
  const safeFailures = Math.max(0, Math.floor(failedAttempts));
  const unlockedHints = Math.min(
    Math.floor(safeFailures / FAILURES_PER_HINT),
    totalHints,
  );
  return {
    failedAttempts: safeFailures,
    unlockedHints,
    attemptsUntilHint:
      unlockedHints >= totalHints
        ? 0
        : FAILURES_PER_HINT - (safeFailures % FAILURES_PER_HINT),
  };
}
