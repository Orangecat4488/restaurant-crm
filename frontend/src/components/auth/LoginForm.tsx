import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      // The backend returns the response body on `err.data`:
      //   { error: 'InvalidCredentials', message: 'Invalid email or password' }
      //   { error: 'AccountLocked', message: 'Account temporarily locked ...', retryAfter, lockedUntil }
      const data = err?.data;
      const message =
        data?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Login failed. Please verify your credentials.';
      setError(message);

      // Surface the lockout so the UI can show a real countdown.
      if (data?.error === 'AccountLocked' && data?.retryAfter) {
        setError(`Аккаунт заблокирован. Повторите через ${data.retryAfter} сек.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@crm-restaurant.com');
    setPassword('Admin@123456');
  };

  const fillDemoClient = () => {
    setEmail('client@bistro.com');
    setPassword('Client@123456');
  };

  const handleResetDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/dev-reset-demo', { method: 'POST' });
      const data = await res.json().catch(() => ({} as any));
      if (data && data.credentials && data.credentials.admin) {
        setEmail(data.credentials.admin.email);
        setPassword(data.credentials.admin.password);
        setError(`Demo credentials reset. Click Sign In to log in as ${data.credentials.admin.email}.`);
      } else {
        setError(data.message || 'Reset succeeded. Try logging in now.');
      }
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center space-x-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Email Address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="admin@crm-restaurant.com"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
        />
      </div>

      <Button type="submit" loading={loading} className="w-full py-2.5 mt-2">
        Sign In to Portal
      </Button>

      {/* Demo helper buttons */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Quick Demo:</span>
        <div className="space-x-2">
          <button
            type="button"
            onClick={fillDemoAdmin}
            className="text-emerald-700 font-semibold hover:underline"
          >
            Admin
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={fillDemoClient}
            className="text-indigo-700 font-semibold hover:underline"
          >
            Client
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={handleResetDemo}
            disabled={loading}
            className="text-amber-700 font-semibold hover:underline disabled:opacity-50"
            title="Force the backend to re-seed the demo admin and client users with the documented passwords"
          >
            Reset Demo
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 mt-4">
        Need a subscription for your restaurant?{' '}
        <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
          Register new account
        </Link>
      </p>
    </form>
  );
};
