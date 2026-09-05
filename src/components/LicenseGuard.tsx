import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ShieldAlert, Key, Loader2 } from 'lucide-react';
import { useLicenseStore } from '../store/licenseStore';
import { useAuthStore } from '../store/authStore';

/**
 * Server-validates the license for the currently-logged-in user before
 * letting the user reach any protected route. Stops on logout, on user
 * change, and on session invalidation.
 */
export default function LicenseGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isActive = useLicenseStore((s) => s.isLicenseActive());
  const status = useLicenseStore((s) => s.status);
  const daysLeft = useLicenseStore((s) => s.daysLeft);
  const ownerUserId = useLicenseStore((s) => s.ownerUserId);
  const checkLicense = useLicenseStore((s) => s.checkLicense);
  const lastCheckedAt = useLicenseStore((s) => s.lastCheckedAt);
  const location = useLocation();
  const [validating, setValidating] = useState(true);

  // The /license page is always reachable for an authenticated user so
  // they can recover from a revoked / expired license.
  if (location.pathname === '/license') {
    return <>{children}</>;
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isAuthenticated || !currentUser || !currentUser.id) {
        setValidating(false);
        return;
      }
      // Re-validate on mount AND whenever the active user changes.
      // We treat the cache as stale after 30s.
      const stale = !lastCheckedAt || Date.now() - lastCheckedAt > 30_000;
      if (ownerUserId !== currentUser.id || stale) {
        setValidating(true);
        try {
          await checkLicense();
        } catch {
          // checkLicense already handles network errors internally
        }
      }
      if (!cancelled) setValidating(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentUser?.id, checkLicense, ownerUserId, lastCheckedAt]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (validating) {
    return (
      <div className="license-validating-screen">
        <Loader2 size={32} className="animate-spin" />
        <p>Проверяем лицензию…</p>
      </div>
    );
  }

  if (isActive) {
    return <>{children}</>;
  }

  const reason =
    status === 'unlicensed' || status === 'unknown'
      ? 'Лицензия не активирована. Введите ключ, чтобы продолжить работу.'
      : status === 'revoked'
        ? 'Лицензия отозвана. Введите новый ключ для восстановления доступа.'
        : 'Срок действия лицензии истёк. Введите новый ключ для восстановления доступа.';

  return (
    <div className="license-lock-screen">
      <div className="license-lock-card">
        <div className="license-lock-icon">
          <ShieldAlert size={56} />
        </div>
        <h1>Доступ к CRM заблокирован</h1>
        <p className="license-lock-reason">{reason}</p>

        {status === 'expired' && daysLeft === 0 && (
          <p className="license-lock-meta">Срок действия истёк</p>
        )}

        <a href="/license" className="license-lock-cta">
          <Key size={18} />
          Перейти к активации лицензии
        </a>
      </div>
    </div>
  );
}