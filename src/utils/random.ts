/** Returns `n` cryptographically random bytes as a Uint8Array. */
export function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}
