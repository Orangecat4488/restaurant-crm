import React, { createContext, useContext, useState, useEffect } from 'react';
import { licenseService, LicenseItem } from '../services/licenseService';
import { useAuthContext } from './AuthContext';

interface LicenseContextType {
  licenses: LicenseItem[];
  loading: boolean;
  fetchLicenses: (status?: string, search?: string) => Promise<void>;
  activeLicense: LicenseItem | null;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLicenses = async (status?: string, search?: string) => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'admin') {
        const data = await licenseService.list({ status, search });
        setLicenses(data);
      }
    } catch (e) {
      console.error('Failed to fetch licenses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchLicenses();
    }
  }, [user]);

  const activeLicense = licenses.find(l => l.status === 'active') || null;

  return (
    <LicenseContext.Provider value={{ licenses, loading, fetchLicenses, activeLicense }}>
      {children}
    </LicenseContext.Provider>
  );
};

export const useLicenseContext = () => {
  const ctx = useContext(LicenseContext);
  if (!ctx) throw new Error('useLicenseContext must be used within a LicenseProvider');
  return ctx;
};
