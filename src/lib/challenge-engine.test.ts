import { describe, expect, it } from "vitest";
import { getPuzzle, interact } from "./challenge-engine";
import { challengeCatalog } from "./challenge-catalog";

const flag = "CYBERUS{ABCDEF1234567890}";
describe("isolated challenge engine", () => {
  it("ships exactly ten challenges with the planned difficulty distribution", () => {
    expect(challengeCatalog).toHaveLength(10);
    expect(
      challengeCatalog.filter((c) => c.difficulty === "EASY"),
    ).toHaveLength(6);
    expect(
      challengeCatalog.filter((c) => c.difficulty === "EASY_MEDIUM"),
    ).toHaveLength(3);
    expect(
      challengeCatalog.filter((c) => c.difficulty === "MEDIUM"),
    ).toHaveLength(1);
  });
  it("uses three progressive hints for every challenge", () => {
    for (const challenge of challengeCatalog)
      expect(challenge.hints).toHaveLength(3);
  });
  it("does not include plaintext flags in ordinary IDOR puzzle data", () => {
    expect(JSON.stringify(getPuzzle("IDOR", flag))).not.toContain(flag);
  });
  it("reveals IDOR evidence only for a fictional allowlisted record", () => {
    expect(
      interact(
        "IDOR",
        "profile",
        "https://campuslink.test/profile?id=101",
        flag,
      ).success,
    ).toBe(false);
    expect(
      interact(
        "IDOR",
        "profile",
        "https://campuslink.test/profile?id=103",
        flag,
      ),
    ).toMatchObject({
      success: true,
      flag,
    });
    expect(
      JSON.stringify(interact("IDOR", "profile", "999", flag)),
    ).not.toContain("participant");
  });
  it("keeps challenge access control on a challenge-only route", () => {
    expect(interact("ACCESS_CONTROL", "route", "/admin", flag).success).toBe(
      false,
    );
    expect(
      interact(
        "ACCESS_CONTROL",
        "route",
        "https://novadesk.test/challenge-admin",
        flag,
      ).success,
    ).toBe(true);
  });
  it("encodes cryptography challenge flags without plaintext", () => {
    const puzzle = getPuzzle("CAESAR", flag);
    expect(puzzle.encoded).not.toBe(flag);
    expect(puzzle.encoded).not.toContain(flag);
  });
  it("encodes Base64 challenge flags without plaintext", () => {
    const puzzle = getPuzzle("BASE64", flag);
    expect(puzzle.encoded).toBe(Buffer.from(flag).toString("base64"));
    expect(puzzle.encoded).not.toContain(flag);
  });
  it("accepts only the simulated phishing indicator", () => {
    expect(
      interact("PHISHING", "select", "security@cyberus-support.co", flag)
        .success,
    ).toBe(true);
    expect(interact("PHISHING", "select", "library", flag).success).toBe(false);
  });
  it("accepts only the simulated exposed network host", () => {
    expect(interact("NETWORK", "select", "192.168.1.20", flag).success).toBe(
      true,
    );
    expect(interact("NETWORK", "select", "router", flag).success).toBe(false);
  });
  it("identifies the intentionally exposed database port", () => {
    expect(interact("PORTS", "select", "3306", flag).success).toBe(true);
    expect(interact("PORTS", "select", "443", flag).success).toBe(false);
  });
  it("does not connect simulated roles to real authorization", () => {
    expect(interact("CLIENT_TRUST", "cookie", "role=admin", flag).success).toBe(
      true,
    );
    expect(interact("CLIENT_TRUST", "cookie", "admin=true", flag).success).toBe(
      false,
    );
  });
  it("reveals source only after the explicit inspection action", () => {
    expect(interact("SOURCE", "view", "", flag).success).toBe(false);
    expect(interact("SOURCE", "inspect", "", flag)).toMatchObject({
      success: true,
      flag,
    });
  });
  it("simulates SQL injection as string matching without executing input", () => {
    expect(interact("SQLI", "login", "' OR '1'='1' --", flag).success).toBe(
      true,
    );
    expect(interact("SQLI", "login", "student", flag).success).toBe(false);
    expect(
      interact(
        "SQLI",
        "login",
        JSON.stringify({
          username: "' OR '1'='1' --",
          password: "anything",
        }),
        flag,
      ).success,
    ).toBe(true);
    expect(
      interact("SQLI", "login", "DROP TABLE Participant", flag).success,
    ).toBe(false);
  });
});
