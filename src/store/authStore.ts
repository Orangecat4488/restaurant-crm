import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';

export type UserRole = 'admin' | 'manager' | 'employee' | 'cashier' | 'waiter';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  active: boolean;
  pin?: string;
  clientId?: string;
}

export interface LoginLockInfo {
  /** Unix seconds when the lock expires — server-side authoritative value. */
  lockedUntil: string;
  retryAfter: number;
}

interface AuthStore {
  currentUser: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  /** Set on a 429 response so the UI can show a server-issued countdown. */
  lockInfo: LoginLockInfo | null;

  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
  refreshToken: () => Promise<boolean>;
  /**
   * Validates the stored token against the server. If the server rejects it
   * (401) or the network fails, the entire auth + license state is cleared
   * so the next user starts from a known-empty baseline.
   */
  validateSession: () => Promise<boolean>;
  clearLockInfo: () => void;
  clearError: () => void;
  clearAll: () => void;

  isAdmin: () => boolean;
  isManager: () => boolean;
  isEmployee: () => boolean;
  isCashier: () => boolean;
  canManageProducts: () => boolean;
  canManageUsers: () => boolean;
  canViewReports: () => boolean;
  canCloseShift: () => boolean;
}

const STORAGE_KEY = 'restaurant-crm-auth';

const getStorage = () => {
  // We always scope the persisted state by the logged-in userId (set on
  // login) so that two different users on the same browser can never
  // observe each other's cached state. A separate, un-namespaced slot is
  // used to remember the *last* userId so we can target its storage entry
  // on logout.
  if (typeof window === 'undefined') {
    return createJSONStorage(() => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} } as any));
  }
  return createJSONStorage(() => window.localStorage);
};

function userSlotKey(userId: string) {
  return `${STORAGE_KEY}:${userId}`;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      accessToken: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      lockInfo: null,

      setAccessToken: (token: string | null) => {
        set({ accessToken: token, isAuthenticated: !!token });
      },

      login: async (email: string, password: string) => {
        set({ loading: true, error: null, lockInfo: null });
        try {
          const deviceFingerprint = getDeviceFingerprint();
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password, deviceFingerprint })
          });

          // The /server backend uses 423 (Locked) for a brute-force
          // blockout. The /backend backend uses 429. Handle both, and
          // accept a server-supplied `retryAfter`/`lockedUntil` if
          // present; otherwise default to 60s.
          if (res.status === 429 || res.status === 423) {
            const data = await res.json().catch(() => ({} as any));
            const retryAfter = Number(
              data.retryAfter ?? data.data?.retryAfter ?? res.headers.get('Retry-After') ?? 60
            );
            const lockedUntil =
              data.lockedUntil ||
              data.data?.lockedUntil ||
              new Date(Date.now() + retryAfter * 1000).toISOString();
            set({ loading: false, lockInfo: { lockedUntil, retryAfter } });
            return {
              success: false,
              error: `Слишком много попыток. Повторите через ${retryAfter} сек.`
            };
          }

          // The server wraps every response as { success, data?, message?, error? }.
          // The login payload lives at data.data.user and data.data.accessToken.
          const data = await res.json().catch(() => ({} as any));
          if (!res.ok) {
            const errorMsg = data.message || data.error || 'Ошибка авторизации';
            set({ loading: false, error: errorMsg });
            return { success: false, error: errorMsg };
          }
          if (!data || data.success === false) {
            const errorMsg = data.message || data.error || 'Ошибка авторизации';
            set({ loading: false, error: errorMsg });
            return { success: false, error: errorMsg };
          }
          const payload = data.data || {};
          if (!payload.user || !payload.user.id || !payload.accessToken) {
            const errorMsg = 'Сервер вернул неожиданный ответ';
            set({ loading: false, error: errorMsg });
            return { success: false, error: errorMsg };
          }

          const u = payload.user;
          const user: User = {
            id: u.id,
            name: u.name || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
            email: u.email,
            role: u.role as UserRole,
            active: true,
            clientId: u.clientId
          };

          set({
            currentUser: user,
            accessToken: payload.accessToken,
            isAuthenticated: true,
            loading: false,
            error: null,
            lockInfo: null
          });

          // Mark this browser as recently belonging to this user so a
          // later logout can target the right storage slot.
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('crm_last_user_id', user.id);
          }
          return { success: true };
        } catch (err: any) {
          const errorMsg = err.message || 'Ошибка сети при авторизации';
          set({ loading: false, error: errorMsg });
          return { success: false, error: errorMsg };
        }
      },

      logout: async () => {
        const { accessToken, currentUser } = get();
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
            },
            credentials: 'include'
          });
        } catch {
          // Network failure must not block the local cleanup.
        }

        // Wipe the per-user storage slot. Without this, a second user
        // signing in on the same browser would inherit the first user's
        // persisted state on the next page refresh.
        if (typeof window !== 'undefined' && currentUser?.id) {
          window.localStorage.removeItem(userSlotKey(currentUser.id));
          window.localStorage.removeItem(`pos_restaurant_license:${currentUser.id}`);
        }
        // Also wipe the un-namespaced legacy keys so a downgrade does
        // not bring back stale data.
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEY);
          window.localStorage.removeItem('pos_restaurant_license');
        }

        set({
          currentUser: null,
          accessToken: null,
          isAuthenticated: false,
          loading: false,
          error: null,
          lockInfo: null
        });
      },

      refreshToken: async () => {
        try {
          const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          });
          const data = await res.json().catch(() => ({} as any));
          if (res.ok && data.success && data.accessToken) {
            set({ accessToken: data.accessToken, isAuthenticated: true });
            return true;
          }
        } catch (err) {
          // fall through to clear
        }
        get().clearAll();
        return false;
      },

      validateSession: async () => {
        const { accessToken, currentUser } = get();
        if (!accessToken || !currentUser || !currentUser.id) return false;
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
            credentials: 'include'
          });
          if (res.ok) {
            const wrap = await res.json();
            const fresh = wrap && wrap.data ? wrap.data : wrap;
            if (!fresh || !fresh.id) {
              get().clearAll();
              return false;
            }
            set({
              currentUser: {
                ...currentUser,
                id: fresh.id,
                email: fresh.email,
                name: fresh.name || currentUser.name,
                role: fresh.role,
                clientId: fresh.client?.id || currentUser.clientId
              },
              isAuthenticated: true
            });
            return true;
          }
        } catch {
          // fall through
        }
        get().clearAll();
        return false;
      },

      clearLockInfo: () => set({ lockInfo: null }),
      clearError: () => set({ error: null }),
      clearAll: () => {
        const { currentUser } = get();
        if (typeof window !== 'undefined' && currentUser?.id) {
          window.localStorage.removeItem(userSlotKey(currentUser.id));
          window.localStorage.removeItem(`pos_restaurant_license:${currentUser.id}`);
        }
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEY);
          window.localStorage.removeItem('pos_restaurant_license');
        }
        set({
          currentUser: null,
          accessToken: null,
          isAuthenticated: false,
          loading: false,
          error: null,
          lockInfo: null
        });
      },

      isAdmin: () => get().currentUser?.role === 'admin',
      isManager: () => get().currentUser?.role === 'manager' || get().currentUser?.role === 'admin',
      isEmployee: () => !!get().currentUser,
      isCashier: () => {
        const role = get().currentUser?.role;
        return role === 'admin' || role === 'manager' || role === 'employee' || role === 'cashier';
      },
      canManageProducts: () => {
        const role = get().currentUser?.role;
        return role === 'admin' || role === 'manager';
      },
      canManageUsers: () => get().currentUser?.role === 'admin',
      canViewReports: () => {
        const role = get().currentUser?.role;
        return role === 'admin' || role === 'manager';
      },
      canCloseShift: () => {
        const role = get().currentUser?.role;
        return role === 'admin' || role === 'manager' || role === 'cashier';
      }
    }),
    {
      // Per-user storage slot — never share between accounts.
      name: STORAGE_KEY,
      storage: getStorage(),
      partialize: (state) => ({
        currentUser: state.currentUser && state.currentUser.id ? state.currentUser : null,
        accessToken: state.accessToken,
        isAuthenticated: !!state.currentUser?.id
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) {
          // Corrupted or empty storage — wipe the legacy keys to prevent
          // them from being picked up on the next mount.
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(STORAGE_KEY);
            window.localStorage.removeItem('pos_restaurant_license');
            window.localStorage.removeItem('crm_last_user_id');
          }
          return;
        }
        if (typeof window === 'undefined') return;
        // Defensive: a persisted `currentUser` without an `id` is from a
        // previous incompatible build. Wipe everything to avoid runtime
        // "Cannot read properties of undefined (reading 'id')" crashes.
        if (state.currentUser && !state.currentUser.id) {
          window.localStorage.removeItem(STORAGE_KEY);
          window.localStorage.removeItem('pos_restaurant_license');
          window.localStorage.removeItem('crm_last_user_id');
          setTimeout(() => useAuthStore.setState({
            currentUser: null,
            accessToken: null,
            isAuthenticated: false,
            loading: false,
            error: null,
            lockInfo: null
          }), 0);
          return;
        }
        const last = window.localStorage.getItem('crm_last_user_id');
        if (last && state.currentUser && last !== state.currentUser.id) {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        if (state.currentUser && state.currentUser.id) {
          window.localStorage.setItem('crm_last_user_id', state.currentUser.id);
        }
      }
    }
  )
);

/**
 * Hook helper used by the LicenseGuard: ensures the persisted auth
 * state really belongs to the userId currently in storage. If it does
 * not, the whole state is cleared. This is the safety net for
 * "Login A, then Login B without page refresh" scenarios.
 */
export function reconcileAuthWithLastUser() {
  if (typeof window === 'undefined') return;
  const last = window.localStorage.getItem('crm_last_user_id');
  const { currentUser, clearAll } = useAuthStore.getState();
  if (last && currentUser?.id && last !== currentUser.id) {
    clearAll();
  }
}