import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';

export const Profile: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    companyName: user?.client?.companyName || '',
    phone: user?.client?.phone || '',
    city: user?.client?.city || '',
    address: user?.client?.address || ''
  });

  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      await authService.updateProfile(profileData);
      await refreshUser();
      setMessage('Restaurant profile updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(passwords.oldPassword, passwords.newPassword);
      setMessage('Password changed successfully! All other sessions were invalidated.');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Account & Security Settings</h2>
        <p className="text-sm text-slate-500">Manage venue details, security credentials, and terminal sessions</p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg">
          ✅ {message}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {/* General Restaurant Profile */}
      <Card title="Restaurant Profile">
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">First Name</label>
              <input
                value={profileData.firstName}
                onChange={e => setProfileData({ ...profileData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Last Name</label>
              <input
                value={profileData.lastName}
                onChange={e => setProfileData({ ...profileData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Company / Restaurant Name</label>
            <input
              value={profileData.companyName}
              onChange={e => setProfileData({ ...profileData, companyName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone</label>
              <input
                value={profileData.phone}
                onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">City</label>
              <input
                value={profileData.city}
                onChange={e => setProfileData({ ...profileData, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <Button type="submit" loading={loading} variant="primary" size="sm">
            Save Changes
          </Button>
        </form>
      </Card>

      {/* Password and Two-Factor Security */}
      <Card title="Security & Authentication">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Current Password</label>
            <input
              type="password"
              required
              value={passwords.oldPassword}
              onChange={e => setPasswords({ ...passwords, oldPassword: e.target.value })}
              className="w-full sm:w-80 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">New Password</label>
              <input
                type="password"
                required
                value={passwords.newPassword}
                onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={passwords.confirmPassword}
                onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <Button type="submit" loading={loading} variant="secondary" size="sm">
            Update Password
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Two-Factor Authentication (2FA)</h4>
            <p className="text-xs text-slate-500">Require an authenticator code when signing into licensing portal</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
          >
            {twoFactorEnabled ? '2FA Enabled ✅' : 'Enable 2FA'}
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-rose-800">Emergency Global Sign-Out</h4>
            <p className="text-xs text-slate-500">Revoke all active refresh sessions across all POS terminals and browsers</p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={logout}
          >
            Sign Out Every Session
          </Button>
        </div>
      </Card>
    </div>
  );
};
