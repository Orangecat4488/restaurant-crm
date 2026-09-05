import path from 'path';
import os from 'os';

export interface LocalConfig {
  apiUrl: string;
  licenseKey?: string;
  token?: string;
  deviceId?: string;
  lastValidated?: string;
  plan?: string;
  expiresAt?: string;
}

export const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.crm-license');
export const DEFAULT_CONFIG_PATH = path.join(DEFAULT_CONFIG_DIR, 'config.json');
export const DEFAULT_API_URL = process.env.API_URL || 'http://localhost:5000/api';
