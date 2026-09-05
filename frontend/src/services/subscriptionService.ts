import { request } from './api';

export interface PlanItem {
  id: string;
  name: string;
  type: 'monthly' | 'half_yearly' | 'yearly';
  price: number;
  currency: string;
  features: Record<string, any>;
  max_users?: number;
  max_locations?: number;
  description?: string;
  is_active: boolean;
}

export interface SubscriptionItem {
  id: string;
  client_id: string;
  plan_id: string;
  license_key: string;
  status: 'active' | 'pending' | 'expired' | 'cancelled' | 'suspended';
  activated_at?: string | null;
  expires_at: string;
  auto_renew: boolean;
  created_at: string;
  plan?: PlanItem;
  license?: any;
}

export const subscriptionService = {
  async getPlans(): Promise<PlanItem[]> {
    return request<PlanItem[]>('/subscriptions/plans');
  },

  async getAllPlans(): Promise<PlanItem[]> {
    return request<PlanItem[]>('/subscriptions/plans/all');
  },

  async createPlan(data: any): Promise<PlanItem> {
    return request<PlanItem>('/subscriptions/plans', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updatePlan(id: string, updates: any): Promise<PlanItem> {
    return request<PlanItem>(`/subscriptions/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async getMySubscriptions(): Promise<SubscriptionItem[]> {
    return request<SubscriptionItem[]>('/subscriptions');
  },

  async getSubscriptionById(id: string) {
    return request(`/subscriptions/${id}`);
  },

  async createSubscription(planId: string, autoRenew = true) {
    return request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ planId, autoRenew })
    });
  },

  async renew(subscriptionId: string) {
    return request(`/subscriptions/${subscriptionId}/renew`, {
      method: 'POST'
    });
  },

  async cancel(subscriptionId: string) {
    return request(`/subscriptions/${subscriptionId}`, {
      method: 'DELETE'
    });
  },

  async toggleAutoRenew(subscriptionId: string, autoRenew: boolean) {
    return request(`/subscriptions/${subscriptionId}/auto-renew`, {
      method: 'PUT',
      body: JSON.stringify({ autoRenew })
    });
  },

  async getHistory(subscriptionId: string) {
    return request(`/subscriptions/${subscriptionId}/history`);
  }
};
