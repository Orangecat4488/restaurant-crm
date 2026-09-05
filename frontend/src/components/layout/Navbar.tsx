import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <span className="text-xl">🍽️</span>
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">CRM Restaurant</h1>
          <p className="text-xs text-slate-500 font-medium">Licensing & Subscriptions System</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-sm font-semibold text-slate-800">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="text-xs text-emerald-600 font-medium uppercase tracking-wider">
            {user?.role} {user?.client ? `• ${user.client.companyName}` : ''}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => logout()}
          className="text-slate-600 hover:text-rose-600"
        >
          Logout
        </Button>
      </div>
    </header>
  );
};
