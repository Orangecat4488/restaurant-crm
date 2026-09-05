import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDateTime } from '../../utils/formatter';

export const Billing: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await request('/payments');
      setPayments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const downloadReceipt = (payment: any) => {
    const text = `
RECEIPT & INVOICE
====================================
Invoice ID: INV-${payment.id.slice(0, 8).toUpperCase()}
Payment Ref: ${payment.stripe_payment_id || 'STRIPE-DIRECT'}
Date: ${new Date(payment.created_at).toLocaleDateString()}
Amount Paid: ${formatCurrency(payment.amount, payment.currency)}
Status: ${payment.status.toUpperCase()}
Description: ${payment.description}
====================================
Thank you for using CRM Restaurant!
    `;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Invoice_${payment.id.slice(0, 8)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Billing & Invoices</h2>
          <p className="text-sm text-slate-500">Review subscription charges, download tax invoices and receipts</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPayments}>Refresh History</Button>
      </div>

      <Card title="Payment & Invoice History">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">
                    INV-{p.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{p.description}</td>
                  <td className="py-3 px-4 text-slate-500 text-xs">{formatDateTime(p.created_at)}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(p.amount, p.currency)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => downloadReceipt(p)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 underline"
                    >
                      Download TXT
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No billing transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
