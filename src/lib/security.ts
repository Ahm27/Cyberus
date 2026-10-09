import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "crypto";

const pepper = () => {
  const value = process.env.SESSION_PEPPER;
  if (process.env.NODE_ENV === "production" && (!value || value.length < 32))
    throw new Error("SESSION_PEPPER must contain at least 32 characters.");
  return value || "development-only-pepper-change-me-now";
};
const key = () => {
  const configured = process.env.FLAG_ENCRYPTION_KEY;
  if (
    process.env.NODE_ENV === "production" &&
    (!configured || !/^[a-f\d]{64}$/i.test(configured))
  )
    throw new Error("FLAG_ENCRYPTION_KEY must be 64 hexadecimal characters.");
  return configured && /^[a-f\d]{64}$/i.test(configured)
    ? Buffer.from(configured, "hex")
    : createHash("sha256").update(`${pepper()}:flag-key`).digest();
};

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}
export function hashSecret(value: string) {
  return createHash("sha256").update(`${pepper()}:${value}`).digest("hex");
}
export function generateFlag() {
  return `CYBERUS{${randomBytes(8).toString("hex").toUpperCase()}}`;
}
export function generateClaimCode() {
  const visual = randomBytes(6)
    .toString("base64url")
    .replace(/[-_]/g, "X")
    .toUpperCase()
    .slice(0, 6);
  return `CYB-${visual.slice(0, 3)}-${visual.slice(3)}`;
}
export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body]
    .map((part) => part.toString("base64url"))
    .join(".");
}
export function decryptSecret(value: string) {
  const [iv, tag, body] = value
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString(
    "utf8",
  );
}
export function constantTimeMatch(candidate: string, expectedHash: string) {
  const actual = Buffer.from(hashSecret(candidate.trim().toUpperCase()), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function normalizeUniversityId(value: string) {
  return value
    .trim()
    .replace(/[\s-]+/g, "")
    .toUpperCase();
}
export function normalizePhone(value: string) {
  return value.trim().replace(/(?!^\+)\D/g, "");
}
export function maskUniversityId(value: string) {
  return `••••${value.slice(-4)}`;
}
