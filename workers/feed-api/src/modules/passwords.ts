import bcrypt from 'bcryptjs';

const BCRYPT_MAX_PASSWORD_BYTES = 72;

export function hasValidBcryptPasswordLength(password: string): boolean {
  return new TextEncoder().encode(password).byteLength <= BCRYPT_MAX_PASSWORD_BYTES;
}

export async function comparePassword(password: string, passwordHash: string): Promise<boolean> {
  if (!hasValidBcryptPasswordLength(password)) return false;
  return bcrypt.compare(password, passwordHash);
}

export async function hashPassword(password: string): Promise<string> {
  if (!hasValidBcryptPasswordLength(password)) {
    throw new RangeError('Password must not exceed 72 UTF-8 bytes');
  }
  return bcrypt.hash(password, 10);
}
