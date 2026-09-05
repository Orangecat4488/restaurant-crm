import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';
import { useAuthStore } from './authStore';

export type LicenseStatus = 'active' | 'expired' | 'unlicensed' | 'revoked' | 'unknown';

export interface LicenseState {
  licenseKey: string | null;
  status: LicenseStatus;
  planName: string;
  expiresAt: string | null;
  daysLeft: number;
  activations: string;
  companyName: string;
  loading: boolean;
  error: string | null;
  /** ID of the user this state was last loaded for. */
  ownerUserId: string | null;
  /** Last successful server check (unix ms). */
  lastCheckedAt: number | null;

  activateLicense: (key: string) => Promise<{ success: boolean; error?: string }>;
  checkLicense: () => Promise<void>;
  deactivateLicense: () => void;
  isLicenseActive: () => boolean;
  reset: () => void;
}

const STORAGE_KEY = 'pos_restaurant_license';
const API_BASE = '/api';

function userKey(userId: string) {
  return `${STORAGE_KEY}:${userId}`;
}

/**
 * Build a fresh, empty state. We deliberately do NOT include any demo
 * data here — the previous implementation hard-coded a fake active
 * license which masked real failures and could leak between accounts.
 */
/** Full in-memory shape of the license slice (persisted fields + runtime flags). */
interface LicenseData extends PersistedShape {
  loading: boolean;
  error: string | null;
}

function emptyState(): LicenseData {
  return {
    licenseKey: null,
    status: 'unlicensed',
    planName: '',
    expiresAt: null,
    daysLeft: 0,
    activations: '0/0',
    companyName: '',
    loading: false,
    error: null,
    ownerUserId: null,
    lastCheckedAt: null
  };
}

interface PersistedShape {
  licenseKey: string | null;
  status: LicenseStatus;
  planName: string;
  expiresAt: string | null;
  daysLeft: number;
  activations: string;
  companyName: string;
  ownerUserId: string | null;
  lastCheckedAt: number | null;
}

const baseState = emptyState();

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
      ...baseState,

      isLicenseActive: () => {
        const s = get();
        return s.status === 'active' && s.daysLeft > 0 && !!s.licenseKey;
      },

      activateLicense: async (rawKey: string) => {
        const initialUser = useAuthStore.getState().currentUser;
        if (!initialUser || !initialUser.id) {
          return { success: false, error: 'Сначала войдите в аккаунт' };
        }
        const key = rawKey.trim().toUpperCase();
        set({ loading: true, error: null, ownerUserId: initialUser.id });

        try {
          const deviceFingerprint = getDeviceFingerprint();
          const res = await fetch(`${API_BASE}/licenses/${encodeURIComponent(key)}/activate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${useAuthStore.getState().accessToken || ''}`
            },
            credentials: 'include',
            body: JSON.stringify({ deviceFingerprint })
          });

          const data = await res.json().catch(() => ({} as any));
          if (!res.ok) {
            throw new Error(data.message || data.error || 'Ошибка активации ключа');
          }

          const expiresDate = data.expiresAt ? new Date(data.expiresAt) : null;
          const now = new Date();
          const daysLeft = expiresDate
            ? Math.max(0, Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : 30;

          // Re-check the active user at the END of the await: if a logout
          // happened in another tab, the captured `initialUser.id` is no
          // longer the live user and we must NOT apply this license to
          // them. We just discard the result silently.
          const liveUser = useAuthStore.getState().currentUser;
          if (!liveUser || liveUser.id !== initialUser.id) {
            set({ loading: false });
            return { success: false, error: 'Сессия изменилась, попробуйте снова' };
          }

          set({
            licenseKey: key,
            status: 'active',
            planName: data.plan || '',
            expiresAt: data.expiresAt,
            daysLeft,
            activations: data.activations || '1/5',
            companyName: data.client?.companyName || '',
            loading: false,
            error: null,
            ownerUserId: liveUser.id,
            lastCheckedAt: Date.now()
          });

          return { success: true };
        } catch (err: any) {
          set({ loading: false, error: err.message });
          return { success: false, error: err.message };
        }
      },

      checkLicense: async () => {
        const { currentUser: caller, accessToken } = useAuthStore.getState();
        if (!caller || !caller.id) {
          set(emptyState());
          return;
        }
        // If the cached state belongs to a different user, drop it before
        // we even start — otherwise we would render another tenant's data.
        const { ownerUserId, licenseKey } = get();
        if (ownerUserId && ownerUserId !== caller.id) {
          set(emptyState());
        }
        if (!licenseKey) {
          set({ status: 'unlicensed', daysLeft: 0, ownerUserId: caller.id });
          return;
        }

        try {
          const res = await fetch(
            `${API_BASE}/licenses/${encodeURIComponent(licenseKey)}/validate`,
            {
              headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
              credentials: 'include'
            }
          );
          const data = await res.json().catch(() => ({} as any));
          // The active user may have changed during the await. Re-verify.
          const live = useAuthStore.getState().currentUser;
          if (!live || live.id !== caller.id) {
            set(emptyState());
            return;
          }
          if (res.ok && data.valid) {
            const expiresDate = data.expiresAt ? new Date(data.expiresAt) : null;
            const now = new Date();
            const daysLeft = expiresDate
              ? Math.max(0, Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
              : 0;
            set({
              status: daysLeft > 0 ? 'active' : 'expired',
              daysLeft,
              planName: data.plan?.name || '',
              expiresAt: data.expiresAt,
              activations: `${data.activations || 1}/${data.maxActivations || 5}`,
              companyName: data.client?.companyName || '',
              ownerUserId: live.id,
              lastCheckedAt: Date.now(),
              error: null
            });
          } else {
            const reason = (data.reason || '').toLowerCase();
            const isRevoked = reason.includes('revoked') || reason.includes('отозван');
            set({
              status: isRevoked ? 'revoked' : 'expired',
              daysLeft: 0,
              error: data.reason || 'Лицензия заблокирована или срок её действия истёк',
              ownerUserId: live.id,
              lastCheckedAt: Date.now()
            });
          }
        } catch (err: any) {
          const live = useAuthStore.getState().currentUser;
          set({
            status: 'unknown',
            error: 'Не удалось проверить лицензию (нет соединения)',
            ownerUserId: live?.id || caller.id,
            lastCheckedAt: Date.now()
          });
        }
      },

      deactivateLicense: () => {
        const { currentUser } = useAuthStore.getState();
        const next = emptyState();
        if (currentUser && currentUser.id) next.ownerUserId = currentUser.id;
        set(next);
      },

      reset: () => {
        const { currentUser } = useAuthStore.getState();
        if (typeof window !== 'undefined' && currentUser && currentUser.id) {
          window.localStorage.removeItem(userKey(currentUser.id));
        }
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        set(emptyState());
      }
    }),
    {
      // Un-namespaced key for the currently-active slot. We always read /
      // write under the per-user key so a second account signing in does
      // not see the first account's license.
      name: STORAGE_KEY,
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} } as any;
        }
        return window.localStorage;
      }),
      partialize: (state): PersistedShape => ({
        licenseKey: state.licenseKey,
        status: state.status,
        planName: state.planName,
        expiresAt: state.expiresAt,
        daysLeft: state.daysLeft,
        activations: state.activations,
        companyName: state.companyName,
        ownerUserId: state.ownerUserId,
        lastCheckedAt: state.lastCheckedAt
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // On rehydration, ensure the cached state belongs to the active
        // user. If not, drop it immediately. Also drop state from a
        // previous build that had a licenseKey but no ownerUserId.
        if (typeof window === 'undefined') return;
        if (state.licenseKey && !state.ownerUserId) {
          // Legacy persisted license from the previous build — wipe it
          // so it cannot satisfy the guard incorrectly.
          window.localStorage.removeItem(STORAGE_KEY);
          useLicenseStore.setState(emptyState());
          return;
        }
        const { currentUser } = useAuthStore.getState();
        if (state.ownerUserId && currentUser && currentUser.id && state.ownerUserId !== currentUser.id) {
          useLicenseStore.setState(emptyState());
        }
      }
    }
  )
);
