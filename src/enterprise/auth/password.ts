// Password hashing and verification for Enterprise accounts.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

function deriveScrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

export async function hashEnterprisePassword(password: string): Promise<string> {
  if (password.length < 10 || password.length > 512) {
    throw new Error("PASSWORD_INVALID");
  }
  const salt = randomBytes(SALT_BYTES);
  const derived = await deriveScrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyEnterprisePassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [algorithm, nRaw, rRaw, pRaw, saltRaw, expectedRaw] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !nRaw || !rRaw || !pRaw || !saltRaw || !expectedRaw) {
    return false;
  }
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (N !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) {
    return false;
  }
  try {
    const salt = Buffer.from(saltRaw, "base64url");
    const expected = Buffer.from(expectedRaw, "base64url");
    if (salt.length !== SALT_BYTES || expected.length !== KEY_LENGTH) {
      return false;
    }
    const actual = await deriveScrypt(password, salt, expected.length, { N, r, p });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
