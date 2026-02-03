import crypto from "crypto";

const ITERATIONS = 210_000;
const KEYLEN = 32;
const DIGEST = "sha256";

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST)
    .toString("hex");

  return `pbkdf2:${DIGEST}:${ITERATIONS}:${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, digest, iterationsStr, salt, expectedHex] = stored.split(":");

  if (scheme !== "pbkdf2") return false;
  if (!digest || !iterationsStr || !salt || !expectedHex) return false;

  const iterations = Number(iterationsStr);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const actual = crypto.pbkdf2Sync(password, salt, iterations, KEYLEN, digest).toString("hex");

  const expectedBuf = Buffer.from(expectedHex, "hex");
  const actualBuf = Buffer.from(actual, "hex");

  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
