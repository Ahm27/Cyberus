import { describe, expect, it } from "vitest";
import { hintProgress } from "./hints";

describe("hint progress", () => {
  it("unlocks one hint for every three failed attempts", () => {
    expect(hintProgress(0)).toEqual({
      failedAttempts: 0,
      unlockedHints: 0,
      attemptsUntilHint: 3,
    });
    expect(hintProgress(3).unlockedHints).toBe(1);
    expect(hintProgress(6).unlockedHints).toBe(2);
    expect(hintProgress(9)).toEqual({
      failedAttempts: 9,
      unlockedHints: 3,
      attemptsUntilHint: 0,
    });
  });

  it("caps progress at the configured hint count", () => {
    expect(hintProgress(99, 2).unlockedHints).toBe(2);
    expect(hintProgress(-4).failedAttempts).toBe(0);
  });
});
