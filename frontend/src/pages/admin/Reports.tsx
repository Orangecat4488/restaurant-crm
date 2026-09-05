import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatCurrency } from '../../utils/formatter';

export const Reports: React.FC = () => {
  const [reports, setReports] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [repData, anaData] = await Promise.all([
        request('/admin/reports'),
        request('/admin/analytics')
      ]);
      setReports(repData);
      setAnalytics(anaData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Generating financial intelligence reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics & Business Intelligence</h2>
          <p className="text-sm text-slate-500">Churn rate, retention metrics, and POS terminal hardware distribution</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          Print Report (PDF)
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-t-4 border-t-emerald-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retention Rate</span>
          <div className="text-3xl font-extrabold text-emerald-600 mt-1">{reports?.retentionRate}</div>
          <span className="text-xs text-slate-400 mt-1 block">Industry benchmark: 85%</span>
        </Card>

        <Card className="border-t-4 border-t-rose-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Churn Rate</span>
          <div className="text-3xl font-extrabold text-rose-600 mt-1">{reports?.churnRate}</div>
          <span className="text-xs text-slate-400 mt-1 block">Lost subscriptions</span>
        </Card>

        <Card className="border-t-4 border-t-blue-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Lifetime Value</span>
          <div className="text-3xl font-extrabold text-blue-600 mt-1">{reports?.averageLTV}</div>
          <span className="text-xs text-slate-400 mt-1 block">Average total spend / client</span>
        </Card>

        <Card className="border-t-4 border-t-purple-500">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cumulative Revenue</span>
          <div className="text-3xl font-extrabold text-purple-600 mt-1">
            {formatCurrency(reports?.totalRevenue || 0)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">All completed charges</span>
        </Card>
      </div>

      {/* Plan Breakdown */}
      <Card title="Revenue Distribution by Subscription Plan">
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Plan Name</th>
                <th className="py-2.5 px-4">Active Subscriptions</th>
                <th className="py-2.5 px-4">Generated Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(reports?.planBreakdown || {}).map(([planName, data]: any) => (
                <tr key={planName} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-bold text-slate-800">{planName}</td>
                  <td className="py-2.5 px-4 font-medium">{data.count}</td>
                  <td className="py-2.5 px-4 font-semibold text-emerald-600">{formatCurrency(data.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Hardware & Geography */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="POS Terminal OS Distribution">
          <div className="space-y-3 mt-3">
            {analytics?.deviceDistribution?.map((dev: any) => (
              <div key={dev.type}>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>{dev.type}</span>
                  <span>{dev.percentage}% ({dev.count} terminals)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${dev.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Geographic Spread">
          <div className="space-y-2 mt-3 text-sm">
            {analytics?.geography?.map((geo: any) => (
              <div key={geo.country} className="flex justify-between py-2 border-b border-slate-100">
                <span className="font-medium text-slate-700">{geo.country}</span>
                <span className="font-bold text-slate-900">{geo.count} venues</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
