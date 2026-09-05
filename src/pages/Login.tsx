import { useEffect, useState } from 'react';
import { LogIn, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const login = useAuthStore((s) => s.login);
  const lockInfo = useAuthStore((s) => s.lockInfo);
  const clearLockInfo = useAuthStore((s) => s.clearLockInfo);
  const clearError = useAuthStore((s) => s.clearError);
  const clearAll = useAuthStore((s) => s.clearAll);
  const currentUser = useAuthStore((s) => s.currentUser);
  const navigate = useNavigate();

  // If we land on /login with a persisted user from a DIFFERENT account,
  // wipe everything. The auth store's onRehydrateStorage does this too,
  // but this covers the case where a user types /login manually.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const last = window.localStorage.getItem('crm_last_user_id');
    if (last && currentUser?.id && last !== currentUser.id) {
      clearAll();
    }
  }, [currentUser, clearAll]);

  // Server-issued countdown. The number we display is computed from
  // lockedUntil, NOT from a local counter that could drift.
  useEffect(() => {
    if (!lockInfo) {
      setCountdown(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(lockInfo.lockedUntil).getTime() - Date.now()) / 1000)
      );
      setCountdown(remaining);
      if (remaining <= 0) clearLockInfo();
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [lockInfo, clearLockInfo]);

  // When the user starts typing after a 429, drop the lock banner so
  // they can see the form again.
  useEffect(() => {
    if (lockInfo && (email || password)) clearLockInfo();
  }, [email, password, lockInfo, clearLockInfo]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Введите email и пароль');
      return;
    }
    if (lockInfo) {
      setError(`Аккаунт временно заблокирован. Осталось ${countdown ?? lockInfo.retryAfter} сек.`);
      return;
    }
    setLoading(true);
    setError('');
    clearError();
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Неверный email или пароль');
      return;
    }
    navigate('/');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e1e2f 0%, #2d2d44 50%, #1a1a2e 100%)',
        padding: '20px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '36px',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          background: 'rgba(255, 255, 255, 0.98)',
        }}
      >
        {/* ЛОГО */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #5B6BFF, #AA3BFF)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 16px rgba(91, 107, 255, 0.3)',
            }}
          >
            <LogIn size={32} color="white" />
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px', color: '#111827' }}>
            Restaurant CRM
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Вход в систему управления
          </p>
        </div>

        {/* ОШИБКА */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              color: '#B91C1C',
              marginBottom: '20px',
              fontSize: '13px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {lockInfo && countdown !== null && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '8px',
              color: '#92400E',
              marginBottom: '20px',
              fontSize: '13px',
              textAlign: 'center'
            }}
          >
            Слишком много попыток входа. Повторите через{' '}
            <strong>{countdown}</strong> сек.
          </div>
        )}

        {/* ФОРМА */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                color="#9CA3AF"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@restaurant.com"
                required
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  height: '46px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Пароль
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                color="#9CA3AF"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  height: '46px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '48px',
              fontSize: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '8px',
            }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={18} />}
            {loading ? 'Вход...' : 'Войти в аккаунт'}
          </button>
        </form>
      </div>
    </div>
  );
}

