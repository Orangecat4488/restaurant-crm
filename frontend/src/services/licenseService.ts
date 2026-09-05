import { request } from './api';

export interface LicenseItem {
  id: string;
  subscription_id: string;
  key: string;
  activation_count: number;
  max_activations: number;
  last_validated_at: string | null;
  device_fingerprint: string | null;
  status: 'active' | 'revoked' | 'expired';
  created_at: string;
  subscription?: any;
  plan?: any;
  client?: any;
}

export const licenseService = {
  async validate(key: string) {
    return request(`/licenses/${encodeURIComponent(key)}/validate`);
  },

  async activate(key: string, deviceFingerprint: string) {
    return request(`/licenses/${encodeURIComponent(key)}/activate`, {
      method: 'POST',
      body: JSON.stringify({ deviceFingerprint })
    });
  },

  async generate(data: { clientId?: string; planId?: string; maxActivations?: number; daysValid?: number }) {
    return request('/licenses/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getById(id: string) {
    return request(`/licenses/${id}`);
  },

  async update(id: string, updates: any) {
    return request(`/licenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async revoke(id: string) {
    return request(`/licenses/${id}`, {
      method: 'DELETE'
    });
  },

  async list(params?: { status?: string; search?: string }): Promise<LicenseItem[]> {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    return request<LicenseItem[]>(`/licenses?${q.toString()}`);
  },

  async resetClientCredentials(clientId: string, newPassword?: string) {
    return request<{ email: string; password: string }>(`/admin/clients/${clientId}/reset-credentials`, {
      method: 'POST',
      body: JSON.stringify(newPassword ? { newPassword } : {})
    });
  },

  async unlockClient(clientId: string) {
    return request<{ success: boolean; cleared: number }>(`/admin/clients/${clientId}/unlock`, {
      method: 'POST'
    });
  }
};
