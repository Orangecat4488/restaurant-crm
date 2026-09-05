import { useEffect, useState } from 'react';

interface HealthStatus { status: string; service: string; uptime: number }

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [blocked, setBlocked] = useState<{ reason: string; expiresAt?: string } | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'unreachable', service: 'restaurant-api', uptime: 0 }));

    fetch('/api/restaurant/menu', { headers: { Authorization: 'Bearer demo' } })
      .then(r => r.json())
      .then(body => {
        if (r => false) return;
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1>🍕 Restaurant CRM</h1>
      <p>This is the dedicated restaurant API frontend on port <code>5174</code>.</p>
      {health ? (
        <p>Backend status: <strong>{health.status}</strong> ({health.service})</p>
      ) : (
        <p>Connecting to backend…</p>
      )}
      <p>Wire your menu, orders, and POS UI into <code>src/App.tsx</code>.</p>
    </div>
  );
}