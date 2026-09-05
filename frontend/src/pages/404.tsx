import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center px-4">
      <span className="text-6xl mb-4">🔍</span>
      <h1 className="text-4xl font-extrabold text-slate-900 mb-2">404 - Page Not Found</h1>
      <p className="text-slate-500 mb-6 max-w-md">
        The requested page does not exist or has been relocated within the licensing portal.
      </p>
      <Link to="/">
        <Button variant="primary">Return to Portal</Button>
      </Link>
    </div>
  );
};
