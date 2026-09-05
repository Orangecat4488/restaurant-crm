import { request } from './api';
import { TokenUtil } from '../utils/token';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'employee' | 'client';
  status: string;
  client?: {
    id: string;
    companyName: string;
    phone?: string;
    country?: string;
    city?: string;
    address?: string;
  } | null;
}

export const authService = {
  async login(email: string, password: string) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    // The backend returns a flat shape: { message, user, accessToken, refreshToken }.
    if (res && res.accessToken) {
      TokenUtil.setAccessToken(res.accessToken);
    }
    return res;
  },

  async register(data: any) {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res && res.accessToken) {
      TokenUtil.setAccessToken(res.accessToken);
    }
    return res;
  },

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      TokenUtil.removeAccessToken();
    }
  },

  async getMe(): Promise<UserProfile> {
    return request<UserProfile>('/auth/me');
  },

  async updateProfile(data: any) {
    return request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async changePassword(oldPassword: string, newPassword: string) {
    return request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  }
};
