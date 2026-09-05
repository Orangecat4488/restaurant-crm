export type UserRole = 'admin' | 'manager' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;
}

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RequestWithUser extends Express.Request {
  user?: JwtPayload;
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  manager: 2,
  employee: 1,
};

export const PERMISSIONS = {
  users: {
    create: ['admin'],
    read: ['admin', 'manager'],
    update: ['admin', 'manager'],
    delete: ['admin'],
  },
  products: {
    create: ['admin', 'manager'],
    read: ['admin', 'manager', 'employee'],
    update: ['admin', 'manager'],
    delete: ['admin'],
  },
  orders: {
    create: ['admin', 'manager', 'employee'],
    read: ['admin', 'manager', 'employee'],
    update: ['admin', 'manager'],
    delete: ['admin'],
  },
  categories: {
    create: ['admin', 'manager'],
    read: ['admin', 'manager', 'employee'],
    update: ['admin', 'manager'],
    delete: ['admin'],
  },
  reports: {
    read: ['admin', 'manager'],
  },
  settings: {
    read: ['admin'],
    update: ['admin'],
  },
} as const;