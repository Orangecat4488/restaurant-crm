export type UserRole = 'admin' | 'manager' | 'employee' | 'client';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type PlanType = 'monthly' | 'half_yearly' | 'yearly';
export type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'cancelled' | 'suspended';
export type LicenseStatus = 'active' | 'revoked' | 'expired';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  /** Plain-text password (demo only). Stored so the seller panel can show it to the client. */
  original_password?: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface Client {
  id: string;
  user_id: string;
  company_name: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  created_at: Date;
  updated_at: Date;
  user?: User;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  type: PlanType;
  price: number;
  currency: string;
  features: Record<string, any>;
  max_users?: number;
  max_locations?: number;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Subscription {
  id: string;
  client_id: string;
  plan_id: string;
  license_key: string;
  status: SubscriptionStatus;
  activated_at?: Date | null;
  expires_at: Date;
  cancelled_at?: Date | null;
  auto_renew: boolean;
  created_at: Date;
  updated_at: Date;
  plan?: SubscriptionPlan;
  client?: Client;
}

export interface License {
  id: string;
  subscription_id: string;
  key: string;
  activation_count: number;
  max_activations: number;
  last_validated_at?: Date | null;
  device_fingerprint?: string | null;
  ip_address?: string | null;
  status: LicenseStatus;
  created_at: Date;
  updated_at: Date;
  subscription?: Subscription;
}

export interface Payment {
  id: string;
  subscription_id: string;
  stripe_payment_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method?: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  subscription?: Subscription;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  ip_address?: string;
  user_agent?: string;
  is_revoked: boolean;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface LoginAttempt {
  id: string;
  email: string;
  device_fingerprint: string;
  ip_address?: string;
  failed_attempts: number;
  blocked_until?: Date | null;
  last_failed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}
