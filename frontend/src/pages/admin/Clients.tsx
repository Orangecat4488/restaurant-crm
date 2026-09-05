import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatCurrency, formatDate } from '../../utils/formatter';

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await request('/admin/clients');
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const openClientDetail = async (id: string) => {
    try {
      const detail = await request(`/admin/clients/${id}`);
      setSelectedClient(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (clientId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await request(`/admin/clients/${clientId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: nextStatus })
    });
    loadClients();
    if (selectedClient) {
      setSelectedClient(null);
    }
  };

  const filteredClients = clients.filter(c =>
    c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.contactName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Client Restaurants</h2>
          <p className="text-sm text-slate-500">Manage client accounts, contact details, and subscriptions</p>
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search restaurants..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Restaurant / Company</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Active Plan</th>
                <th className="py-3 px-4">Total Revenue</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{c.companyName}</span>
                    <span className="text-xs text-slate-400">{c.city} • {c.phone}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-800 font-medium block">{c.contactName}</span>
                    <span className="text-xs text-slate-400">{c.email}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-full text-xs">
                      {c.activePlan}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {formatCurrency(c.totalSpent || 0)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        c.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => openClientDetail(c.id)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      View Details
                    </button>
                    <span>|</span>
                    <button
                      onClick={() => handleToggleStatus(c.id, c.status)}
                      className={`text-xs font-semibold ${
                        c.status === 'active' ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-600 hover:text-emerald-800'
                      }`}
                    >
                      {c.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Client Details Modal */}
      <Modal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title={selectedClient?.client?.company_name || 'Client Details'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-lg">
            <div>
              <span className="text-slate-400 text-xs block">Contact</span>
              <span className="font-semibold text-slate-800">
                {selectedClient?.user?.firstName} {selectedClient?.user?.lastName}
              </span>
              <span className="text-xs text-slate-500 block">{selectedClient?.user?.email}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs block">Location</span>
              <span className="font-semibold text-slate-800">
                {selectedClient?.client?.city}, {selectedClient?.client?.country}
              </span>
              <span className="text-xs text-slate-500 block">{selectedClient?.client?.address || 'No address'}</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subscriptions & Keys</h4>
            <div className="space-y-2">
              {selectedClient?.subscriptions?.map((sub: any) => (
                <div key={sub.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">{sub.plan?.name} ({sub.plan?.type})</span>
                    <span className="font-mono text-emerald-700">{sub.license_key}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-semibold">Expires: {formatDate(sub.expires_at)}</span>
                    <span className="text-slate-400">{sub.status.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
