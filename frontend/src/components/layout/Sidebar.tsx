import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
    { name: 'Licenses', path: '/admin/licenses', icon: '🔑' },
    { name: 'Subscription Plans', path: '/admin/plans', icon: '💳' },
    { name: 'Clients', path: '/admin/clients', icon: '👥' },
    { name: 'Payments', path: '/admin/payments', icon: '💰' },
    { name: 'Reports & Analytics', path: '/admin/reports', icon: '📈' }
  ];

  const clientLinks = [
    { name: 'Overview', path: '/client/dashboard', icon: '🏠' },
    { name: 'Subscription Status', path: '/client/subscription', icon: '📋' },
    { name: 'Billing & Invoices', path: '/client/billing', icon: '🧾' },
    { name: 'Restaurant Profile', path: '/client/profile', icon: '⚙️' }
  ];

  const links = isAdmin ? adminLinks : clientLinks;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen">
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
          R
        </div>
        <div>
          <span className="text-white font-bold tracking-tight text-base block">Licensing Hub</span>
          <span className="text-xs text-slate-400">{isAdmin ? 'Admin Console' : 'Client Portal'}</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {links.map(link => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <span className="text-lg">{link.icon}</span>
            <span>{link.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        CRM Restaurant Licensing v1.0
      </div>
    </aside>
  );
};
