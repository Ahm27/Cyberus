import { describe, expect, it } from "vitest";
import {
  constantTimeMatch,
  decryptSecret,
  encryptSecret,
  generateClaimCode,
  generateFlag,
  hashSecret,
  normalizePhone,
  normalizeUniversityId,
  randomToken,
} from "./security";

describe("security primitives", () => {
  it("generates unpredictable-looking flags in the required format", () => {
    const flags = new Set(Array.from({ length: 100 }, generateFlag));
    expect(flags.size).toBe(100);
    for (const flag of flags) expect(flag).toMatch(/^CYBERUS\{[A-F0-9]{16}\}$/);
  });
  it("does not accept an incorrect flag", () => {
    const flag = generateFlag();
    expect(constantTimeMatch(flag, hashSecret(flag))).toBe(true);
    expect(constantTimeMatch(generateFlag(), hashSecret(flag))).toBe(false);
  });
  it("does not accept a flag from another challenge or participant", () => {
    const a = generateFlag(),
      b = generateFlag();
    expect(constantTimeMatch(a, hashSecret(b))).toBe(false);
  });
  it("encrypts flags at rest and decrypts only with the server key", () => {
    const flag = generateFlag();
    const encrypted = encryptSecret(flag);
    expect(encrypted).not.toContain(flag);
    expect(decryptSecret(encrypted)).toBe(flag);
  });
  it("creates unique opaque session tokens", () => {
    expect(randomToken()).not.toBe(randomToken());
    expect(randomToken().length).toBeGreaterThan(30);
  });
  it("creates human-readable unique claim codes", () => {
    const codes = new Set(Array.from({ length: 100 }, generateClaimCode));
    expect(codes.size).toBe(100);
    for (const code of codes)
      expect(code).toMatch(/^CYB-[A-Z0-9]{3}-[A-Z0-9]{3}$/);
  });
  it("normalizes identity fields", () => {
    expect(normalizeUniversityId(" ab- 12 ")).toBe("AB12");
    expect(normalizePhone("+20 (100) 123-4567")).toBe("+201001234567");
  });
});
