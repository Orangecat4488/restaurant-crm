import React from 'react';
import { LoginForm } from '../../components/auth/LoginForm';

export const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 text-3xl mb-4 border border-emerald-500/30">
          🍽️
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Restaurant CRM
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Commercial Licensing & Subscription Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};
