/**
 * Secure password hashing utility using standard Web Crypto API (SHA-256 with random salt).
 * Passwords are never stored in plaintext.
 */

export async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const chosenSalt = salt || generateSalt();
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ':' + chosenSalt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash: hashHex, salt: chosenSalt };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  return computed.hash === hash;
}

export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
