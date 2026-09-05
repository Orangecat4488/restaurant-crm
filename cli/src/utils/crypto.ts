import crypto from 'crypto';
import os from 'os';

const CLI_INTERNAL_SECRET = 'crm-license-cli-local-key-32ch!!'; // Exactly 32 bytes

export class CliCrypto {
  static getDeviceFingerprint(): string {
    const interfaces = os.networkInterfaces();
    let mac = '';
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (iface) {
        for (const alias of iface) {
          if (!alias.internal && alias.mac && alias.mac !== '00:00:00:00:00:00') {
            mac = alias.mac;
            break;
          }
        }
      }
      if (mac) break;
    }

    const raw = `${os.hostname()}-${os.platform()}-${os.arch()}-${mac || 'crm-default-mac'}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
  }

  static encrypt(text: string): string {
    const key = Buffer.from(CLI_INTERNAL_SECRET, 'utf-8');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  static decrypt(encryptedPayload: string): string {
    try {
      const [ivHex, encryptedText] = encryptedPayload.split(':');
      if (!ivHex || !encryptedText) return encryptedPayload;
      const key = Buffer.from(CLI_INTERNAL_SECRET, 'utf-8');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return encryptedPayload;
    }
  }
}
