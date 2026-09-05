import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';

export const RegisterForm: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
    phone: '',
    city: '',
    country: 'United States'
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(formData);
      navigate('/client/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
          <input
            name="firstName"
            required
            value={formData.firstName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
          <input
            name="lastName"
            required
            value={formData.lastName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Restaurant / Company Name</label>
        <input
          name="companyName"
          required
          placeholder="e.g. Bella Italia Trattoria"
          value={formData.companyName}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
        <input
          type="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Password (min 8 chars, 1 uppercase, 1 number, 1 symbol)
        </label>
        <input
          type="password"
          name="password"
          required
          placeholder="Min 8 chars, e.g. Pass@1234"
          value={formData.password}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
          <input
            name="phone"
            placeholder="+1 555 123 4567"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
          <input
            name="city"
            placeholder="New York"
            value={formData.city}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <Button type="submit" loading={loading} className="w-full py-2.5 mt-3">
        Create Restaurant Account
      </Button>

      <p className="text-center text-xs text-slate-500 pt-2">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-600 font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
};
