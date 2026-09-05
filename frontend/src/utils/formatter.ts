export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount);
};

export const formatDate = (dateStr?: string | Date | null): string => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (dateStr?: string | Date | null): string => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const maskLicenseKey = (key?: string): string => {
  if (!key) return '';
  const parts = key.split('-');
  if (parts.length === 4) {
    return `${parts[0]}-****-****-${parts[3]}`;
  }
  return key.slice(0, 4) + '****' + key.slice(-4);
};

export const getDaysRemaining = (expiresAt?: string | Date | null): number => {
  if (!expiresAt) return 0;
  const exp = new Date(expiresAt).getTime();
  const now = new Date().getTime();
  return Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)));
};
