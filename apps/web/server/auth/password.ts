import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_OPTIONS: ScryptOptions = {
  N: SCRYPT_N,
  r: SCRYPT_R,
  p: SCRYPT_P,
  maxmem: 64 * 1024 * 1024,
};

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt);
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64url"), derivedKey.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, n, r, p, saltValue, hashValue, extra] = encodedHash.split("$");

  if (algorithm !== "scrypt" || n !== String(SCRYPT_N) || r !== String(SCRYPT_R) || p !== String(SCRYPT_P) || !saltValue || !hashValue || extra !== undefined) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;

  try {
    salt = Buffer.from(saltValue, "base64url");
    expected = Buffer.from(hashValue, "base64url");
  } catch {
    return false;
  }

  if (salt.length !== 16 || expected.length !== SCRYPT_KEY_LENGTH) return false;

  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}
