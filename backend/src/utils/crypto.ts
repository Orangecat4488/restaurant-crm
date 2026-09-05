import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config';

const BCRYPT_ROUNDS = 12;

export class CryptoUtil {
  /**
   * Hashes a password using bcrypt with 12 rounds
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compares plain password with bcrypt hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates a unique license key formatted as XXXX-XXXX-XXXX-XXXX
   */
  static generateLicenseKey(): string {
    const bytes = crypto.randomBytes(8).toString('hex').toUpperCase();
    return bytes.match(/.{1,4}/g)!.join('-');
  }

  /**
   * Generates a temporary, human-readable password for client credential resets.
   */
  static generateTempPassword(length = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(length);
    let out = '';
    for (let i = 0; i < length; i++) {
      out += chars[bytes[i] % chars.length];
    }
    return out;
  }

  /**
   * Validates format of license key (4 groups of 4 alphanumeric characters)
   */
  static validateLicenseKeyFormat(key: string): boolean {
    return /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/i.test(key.trim());
  }

  /**
   * Encrypts plaintext data using AES-256-CBC
   */
  static encrypt(text: string, customKey?: string): string {
    const key = Buffer.from(customKey || config.security.licenseEncryptionKey, 'utf-8');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts AES-256-CBC encrypted data
   */
  static decrypt(encryptedPayload: string, customKey?: string): string {
    const [ivHex, encryptedText] = encryptedPayload.split(':');
    if (!ivHex || !encryptedText) {
      throw new Error('Invalid encrypted payload format');
    }
    const key = Buffer.from(customKey || config.security.licenseEncryptionKey, 'utf-8');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Hashes a token string for safe storage in refresh_tokens table
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Creates a device fingerprint hash
   */
  static hashFingerprint(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}
