import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDateTime } from '../../utils/formatter';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const data = await request('/admin/dashboard');
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-slate-500 font-medium">Loading executive metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h2>
          <p className="text-sm text-slate-500">Commercial CRM licensing & recurring revenue overview</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link to="/admin/licenses">
            <Button variant="primary" size="sm">
              + Generate License
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchDashboard}>
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue MTD</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(metrics?.revenueMTD || 0)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">YTD: {formatCurrency(metrics?.revenueYTD || 0)}</span>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Subscriptions</span>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">
            {metrics?.activeSubscriptions || 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Total Clients: {metrics?.totalClients || 0}</span>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expired Subscriptions</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {metrics?.expiredSubscriptions || 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Pending: {metrics?.pendingSubscriptions || 0}</span>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Licenses</span>
          <div className="text-2xl font-extrabold text-purple-600 mt-1">
            {metrics?.activeLicenses || 0} / {metrics?.totalLicenses || 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Revoked: {metrics?.revokedLicenses || 0}</span>
        </Card>
      </div>

      {/* Revenue & Growth Trend Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Monthly Revenue Trajectory" className="lg:col-span-2">
          <div className="mt-4 space-y-3">
            {metrics?.revenueChart?.map((item: any) => {
              const maxRev = Math.max(...metrics.revenueChart.map((x: any) => x.revenue), 100);
              const widthPct = Math.max(8, Math.round((item.revenue / maxRev) * 100));
              return (
                <div key={item.month} className="flex items-center text-sm">
                  <span className="w-12 font-semibold text-slate-600">{item.month}</span>
                  <div className="flex-1 mx-3 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="w-24 text-right font-medium text-slate-800">{formatCurrency(item.revenue)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Payment Status Breakdown">
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 text-emerald-800">
              <span className="font-semibold text-sm">Completed</span>
              <span className="font-bold">{metrics?.paymentBreakdown?.completed || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 text-amber-800">
              <span className="font-semibold text-sm">Pending</span>
              <span className="font-bold">{metrics?.paymentBreakdown?.pending || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 text-rose-800">
              <span className="font-semibold text-sm">Failed</span>
              <span className="font-bold">{metrics?.paymentBreakdown?.failed || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 text-slate-800">
              <span className="font-semibold text-sm">Refunded</span>
              <span className="font-bold">{metrics?.paymentBreakdown?.refunded || 0}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Audit Logs */}
      <Card title="Recent Security & System Activity">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Resource</th>
                <th className="py-2.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics?.recentAuditLogs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{log.action}</td>
                  <td className="py-2.5 px-4 text-slate-500 capitalize">{log.resource_type || 'System'}</td>
                  <td className="py-2.5 px-4 text-slate-400 text-xs">{formatDateTime(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
