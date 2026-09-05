import fs from 'fs';
import path from 'path';
import { DEFAULT_CONFIG_DIR, DEFAULT_CONFIG_PATH, LocalConfig } from '../utils/config';
import { CliCrypto } from '../utils/crypto';

export class StorageService {
  private configPath: string;

  constructor(customPath?: string) {
    this.configPath = customPath || DEFAULT_CONFIG_PATH;
  }

  load(): LocalConfig {
    try {
      if (!fs.existsSync(this.configPath)) {
        return { apiUrl: 'http://localhost:5000/api' };
      }
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      const data = JSON.parse(raw);

      return {
        apiUrl: data.apiUrl || 'http://localhost:5000/api',
        licenseKey: data.licenseKey ? CliCrypto.decrypt(data.licenseKey) : undefined,
        token: data.token ? CliCrypto.decrypt(data.token) : undefined,
        deviceId: data.deviceId,
        lastValidated: data.lastValidated,
        plan: data.plan,
        expiresAt: data.expiresAt
      };
    } catch {
      return { apiUrl: 'http://localhost:5000/api' };
    }
  }

  save(config: LocalConfig): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const payload = {
      apiUrl: config.apiUrl,
      licenseKey: config.licenseKey ? CliCrypto.encrypt(config.licenseKey) : undefined,
      token: config.token ? CliCrypto.encrypt(config.token) : undefined,
      deviceId: config.deviceId,
      lastValidated: config.lastValidated,
      plan: config.plan,
      expiresAt: config.expiresAt
    };

    fs.writeFileSync(this.configPath, JSON.stringify(payload, null, 2), 'utf-8');
  }

  clear(): void {
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
    }
  }
}
