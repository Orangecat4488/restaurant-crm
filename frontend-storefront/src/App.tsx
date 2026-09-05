import { useEffect, useState } from 'react';

interface Plan {
  id: string;
  name: string;
  type: string;
  price: number;
  currency: string;
  description: string;
  features: Record<string, any>;
  max_users?: number;
  max_locations?: number;
}

interface FormState {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  planId: string;
}

export default function App() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<FormState>({
    email: '', password: '', firstName: '', lastName: '', companyName: '', planId: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ licenseKey: string; checkoutUrl: string; mode: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/storefront/plans').then(r => r.json()).then((data: Plan[]) => {
      setPlans(data);
      if (data[0]) setForm(f => ({ ...f, planId: data[0].id }));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/storefront/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create account');
      setResult(data);
      if (data.mode === 'mock' && data.checkoutUrl) {
        // Auto-redirect in mock mode after a short delay
        setTimeout(() => { window.location.href = data.checkoutUrl; }, 1500);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Restaurant CRM</h1>
      <p style={{ color: '#6b7280', marginTop: 0 }}>Choose a plan and get an instant license key.</p>

      <div className="grid" style={{ marginBottom: 32 }}>
        {plans.map(p => (
          <div key={p.id} className="card" style={{ border: form.planId === p.id ? '2px solid #5B6BFF' : undefined }}>
            <div className="badge">{p.type.replace('_', ' ')}</div>
            <h3 style={{ marginTop: 8 }}>{p.name}</h3>
            <p style={{ fontSize: 28, fontWeight: 700, margin: '8px 0' }}>${p.price} <span style={{ fontSize: 14, color: '#6b7280' }}>/ {p.currency}</span></p>
            <p style={{ color: '#4b5563', minHeight: 48 }}>{p.description}</p>
            <p style={{ fontSize: 12, color: '#6b7280' }}>Up to {p.max_users} users · {p.max_locations} locations</p>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, planId: p.id }))}
              style={{ background: form.planId === p.id ? '#4338ca' : '#5B6BFF', marginTop: 8 }}
            >
              {form.planId === p.id ? 'Selected ✓' : 'Choose plan'}
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="card">
        <h3>Create your account</h3>
        <div className="grid">
          <div><label>First name</label><input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required /></div>
          <div><label>Last name</label><input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required /></div>
          <div><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
          <div><label>Password</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label>Restaurant / company name</label><input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} required /></div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={loading || !form.planId}>
            {loading ? 'Creating…' : 'Create account & checkout'}
          </button>
        </div>
        {error && <p style={{ color: '#dc2626', marginTop: 12 }}>{error}</p>}
        {result && (
          <div style={{ marginTop: 16, padding: 12, background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>✓ License key generated</p>
            <p style={{ margin: 0, fontFamily: 'monospace' }}>{result.licenseKey}</p>
            <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Checkout mode: {result.mode}. Redirecting…</p>
          </div>
        )}
      </form>
    </div>
  );
}