import crypto from 'crypto';

/**
 * Compute SHA-256 of a string. Returns hex digest.
 */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * SHA-256 of a Buffer. Returns hex digest.
 */
export function sha256Buffer(input: Buffer): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Timing-safe comparison of two hex strings.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a.toLowerCase(), 'hex');
    const bufB = Buffer.from(b.toLowerCase(), 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Validate a Safe Exam Browser request hash.
 *
 * SEB computes: SHA-256(requestURL + configKeyBytes)
 * where configKeyBytes = Buffer.from(configKeyHex, 'hex')
 *
 * @param requestUrl  Full URL of the incoming request (including protocol + host + path)
 * @param headerHash  Value of X-SafeExamBrowser-RequestHash header
 * @param configKeyHex  Hex-encoded Config Key from SEB preferences
 */
export function validateSEBHash(
  requestUrl: string,
  headerHash: string,
  configKeyHex: string,
): boolean {
  try {
    const configKeyBytes = Buffer.from(configKeyHex, 'hex');
    const urlBytes = Buffer.from(requestUrl, 'utf8');
    const combined = Buffer.concat([urlBytes, configKeyBytes]);
    const expected = sha256Buffer(combined);
    return timingSafeEqual(expected, headerHash);
  } catch {
    return false;
  }
}

/**
 * Hash a refresh token for safe storage in the database.
 */
export function hashToken(raw: string): string {
  return sha256(raw);
}

/**
 * Generate cryptographically secure random hex string.
 */
export function randomHex(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
