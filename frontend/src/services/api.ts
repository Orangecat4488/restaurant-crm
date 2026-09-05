import { TokenUtil } from '../utils/token';

const BASE_URL = '/api';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

export async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const token = TokenUtil.getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // include httpOnly cookies
    });

    // Handle 401 Unauthorized for token refresh
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            TokenUtil.setAccessToken(data.accessToken);
            processQueue(null, data.accessToken);
            isRefreshing = false;

            // Retry original request with new token
            headers['Authorization'] = `Bearer ${data.accessToken}`;
            const retryRes = await fetch(url, { ...options, headers, credentials: 'include' });
            return await retryRes.json();
          } else {
            TokenUtil.removeAccessToken();
            processQueue(new Error('Session expired'), null);
            isRefreshing = false;
            window.location.href = '/login';
            throw new ApiError('Session expired', 401);
          }
        } catch (refreshErr) {
          TokenUtil.removeAccessToken();
          processQueue(refreshErr, null);
          isRefreshing = false;
          window.location.href = '/login';
          throw refreshErr;
        }
      } else {
        // Wait for refresh to finish
        return new Promise<T>((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken: string) => {
              headers['Authorization'] = `Bearer ${newToken}`;
              fetch(url, { ...options, headers, credentials: 'include' })
                .then(res => res.json())
                .then(resolve)
                .catch(reject);
            },
            reject
          });
        });
      }
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(data.message || data.error || 'API Request failed', response.status, data);
    }
    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network error', 0);
  }
}
