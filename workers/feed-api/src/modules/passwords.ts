import bcrypt from 'bcryptjs';

const BCRYPT_MAX_PASSWORD_BYTES = 72;

export function hasValidBcryptPasswordLength(password: string): boolean {
  return new TextEncoder().encode(password).byteLength <= BCRYPT_MAX_PASSWORD_BYTES;
}

export async function comparePassword(password: string, passwordHash: string): Promise<boolean> {
  if (!hasValidBcryptPasswordLength(password)) return false;
  return bcrypt.compare(password, passwordHash);
}
