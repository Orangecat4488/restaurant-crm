import { LocalConfig } from '../utils/config';

export class ApiClient {
  private apiUrl: string;
  private token?: string;

  constructor(config: LocalConfig) {
    this.apiUrl = config.apiUrl.replace(/\/+$/, '');
    this.token = config.token;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.apiUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as any)
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP error ${response.status}`);
      }
      return data;
    } catch (err: any) {
      throw new Error(`API Request to ${url} failed: ${err.message}`);
    }
  }

  async validateLicense(key: string) {
    return this.request(`/licenses/${encodeURIComponent(key)}/validate`);
  }

  async activateLicense(key: string, deviceFingerprint: string) {
    return this.request(`/licenses/${encodeURIComponent(key)}/activate`, {
      method: 'POST',
      body: JSON.stringify({ deviceFingerprint })
    });
  }

  async deactivateLicense(key: string, deviceFingerprint: string) {
    return this.request(`/licenses/${encodeURIComponent(key)}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ deviceFingerprint })
    });
  }

  async getLicense(keyOrId: string) {
    return this.request(`/licenses/${encodeURIComponent(keyOrId)}`);
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async renewSubscription(subscriptionId: string) {
    return this.request(`/subscriptions/${encodeURIComponent(subscriptionId)}/renew`, {
      method: 'POST'
    });
  }
}
