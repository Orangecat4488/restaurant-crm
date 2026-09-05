import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDateTime } from '../../utils/formatter';

export const Payments: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const q = statusFilter ? `?status=${statusFilter}` : '';
      const data = await request(`/payments${q}`);
      setPayments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [statusFilter]);

  const handleRefund = async (id: string) => {
    if (!window.confirm('Process refund for this payment? This will record a refund and revoke linked licenses.')) return;
    await request(`/payments/${id}/refund`, { method: 'POST' });
    loadPayments();
  };

  const exportCSV = () => {
    const headers = ['ID', 'Client', 'Plan', 'Amount', 'Currency', 'Status', 'Date'];
    const rows = payments.map(p => [
      p.id,
      p.clientCompanyName || 'N/A',
      p.planName || 'N/A',
      p.amount,
      p.currency,
      p.status,
      formatDateTime(p.created_at)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'payments_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Payments & Transactions</h2>
          <p className="text-sm text-slate-500">Stripe charges, automated subscription renewals, and refunds</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="">All Payments</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Client Restaurant</th>
                <th className="py-3 px-4">Plan Description</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono text-xs text-slate-500">{p.id.slice(0, 8)}...</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{p.clientCompanyName}</td>
                  <td className="py-3 px-4 text-slate-600">{p.description || p.planName}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {formatCurrency(p.amount, p.currency)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        p.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'refunded'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs">{formatDateTime(p.created_at)}</td>
                  <td className="py-3 px-4 text-right">
                    {p.status === 'completed' && (
                      <button
                        onClick={() => handleRefund(p.id)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
