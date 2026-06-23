import bcryptjs from 'bcryptjs';

/**
 * Password hashing.
 *
 * Prefer the **native `bcrypt`** binding: its hash/compare run on the libuv
 * thread pool, so they neither block the Node event loop nor serialise on a
 * single thread the way pure-JS `bcryptjs` does. Under concurrent logins this
 * is the difference between the API staying responsive and the event loop
 * stalling on CPU-bound hashing (see the load-test findings).
 *
 * If the native binary can't be loaded on the deploy target (platform/arch
 * mismatch on some serverless runtimes), we fall back to `bcryptjs` so auth
 * keeps working. The two libraries are hash-compatible in both directions, so a
 * password hashed by one verifies under the other — no migration, mixed
 * deploys are safe.
 */
type BcryptLike = {
  hash(data: string, saltOrRounds: string | number): Promise<string>;
  compare(data: string, encrypted: string): Promise<boolean>;
};

let impl: BcryptLike = bcryptjs;
let usingNative = false;
try {
  impl = require('bcrypt') as BcryptLike;
  usingNative = true;
} catch {
  // Native binding unavailable — stay on bcryptjs.
  impl = bcryptjs;
  usingNative = false;
}

export const PASSWORD_HASH_BACKEND = usingNative ? 'bcrypt(native)' : 'bcryptjs';

/**
 * Cost factor. Tunable via env without a deploy so throughput vs. brute-force
 * cost can be balanced operationally. Defaults to 12. Existing hashes encode
 * their own cost, so changing this never invalidates old passwords.
 */
const SALT_ROUNDS = (() => {
  const parsed = Number(process.env.BCRYPT_SALT_ROUNDS);
  return Number.isInteger(parsed) && parsed >= 8 && parsed <= 15 ? parsed : 12;
})();

export async function hashPassword(password: string): Promise<string> {
  return impl.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return impl.compare(password, hashedPassword);
}

/**
 * A valid bcrypt hash used to equalize login timing when the email doesn't
 * exist — run verifyPassword against this so a missing account takes the same
 * time as a wrong password, defeating user-enumeration via response timing.
 * Computed once, lazily.
 */
let dummyHash: string | null = null;
export async function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = await impl.hash('bucr-timing-equalizer', SALT_ROUNDS);
  return dummyHash;
}
