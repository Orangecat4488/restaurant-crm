import React, { useState, useEffect } from 'react';
import { licenseService, LicenseItem } from '../../services/licenseService';
import { subscriptionService, PlanItem } from '../../services/subscriptionService';
import { request } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatter';
import { Copy, KeyRound, RefreshCw, Unlock, Eye, EyeOff } from 'lucide-react';

export const LicenseManager: React.FC = () => {
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLicenseData, setNewLicenseData] = useState({
    clientId: '',
    planId: '',
    maxActivations: 5,
    daysValid: 30
  });

  const [revealedCreds, setRevealedCreds] = useState<Record<string, { email: string; password: string }>>({});
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      flashToast(`${label} скопировано`);
    } catch {
      flashToast('Не удалось скопировать');
    }
  };

  const handleResetCredentials = async (clientId: string) => {
    if (!window.confirm('Сгенерировать новый пароль для клиента? Старый пароль перестанет работать.')) return;
    setBusyClientId(clientId);
    try {
      const result = await licenseService.resetClientCredentials(clientId);
      setRevealedCreds(prev => ({ ...prev, [clientId]: { email: result.email, password: result.password } }));
      flashToast('Новый пароль сгенерирован. Передайте его клиенту.');
      loadData();
    } catch (err: any) {
      flashToast(`Ошибка: ${err.message}`);
    } finally {
      setBusyClientId(null);
    }
  };

  const handleUnlock = async (clientId: string) => {
    setBusyClientId(clientId);
    try {
      const result = await licenseService.unlockClient(clientId);
      flashToast(`Блокировка снята (очищено ${result.cleared} записей)`);
    } catch (err: any) {
      flashToast(`Ошибка: ${err.message}`);
    } finally {
      setBusyClientId(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [licList, plansList, clientsList] = await Promise.all([
        licenseService.list({ status: statusFilter || undefined, search }),
        subscriptionService.getPlans(),
        request('/admin/clients')
      ]);
      setLicenses(licList);
      setPlans(plansList);
      setClients(clientsList);
      if (plansList.length > 0) {
        setNewLicenseData(prev => ({ ...prev, planId: plansList[0].id }));
      }
      if (clientsList.length > 0) {
        setNewLicenseData(prev => ({ ...prev, clientId: clientsList[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this license key immediately?')) return;
    await licenseService.revoke(id);
    loadData();
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    await licenseService.generate(newLicenseData);
    setIsModalOpen(false);
    loadData();
  };

  const exportCSV = () => {
    const headers = ['Key', 'Company', 'Plan', 'Status', 'Activations', 'Expires'];
    const rows = licenses.map(l => [
      l.key,
      l.client?.company_name || 'N/A',
      l.plan?.name || 'N/A',
      l.status,
      `${l.activation_count}/${l.max_activations}`,
      l.subscription?.expires_at ? formatDate(l.subscription.expires_at) : 'N/A'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'licenses_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">License Manager</h2>
          <p className="text-sm text-slate-500">Monitor, issue, and manage restaurant POS license keys</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            Export CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            + Generate License
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Search by license key or client company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <Button type="submit" variant="secondary" size="sm">Search</Button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </form>
      </Card>

      {/* Licenses Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">License Key</th>
                <th className="py-3 px-4">Client Restaurant</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Activations</th>
                <th className="py-3 px-4">Expiration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {licenses.map(lic => {
                const clientId = lic.client?.id || lic.client?.userId;
                const email = lic.client?.userEmail || lic.client?.email;
                const password = lic.client?.userOriginalPassword;
                const revealed = clientId ? revealedCreds[clientId] : null;
                return (
                  <tr key={lic.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 align-top">{lic.key}</td>
                    <td className="py-3 px-4 align-top">
                      <span className="font-semibold block text-slate-800">
                        {lic.client?.company_name || 'Individual / Unassigned'}
                      </span>
                      <span className="text-xs text-slate-400 block">{email || ''}</span>

                      {clientId && (
                        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] space-y-1">
                          <div className="flex items-center gap-1 text-slate-500 font-semibold uppercase tracking-wide">
                            <KeyRound size={11} />
                            <span>Доступ клиента</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 w-12 shrink-0">Логин:</span>
                            <span className="font-mono text-slate-800 truncate">{email}</span>
                            <button
                              onClick={() => copyToClipboard(email, 'Логин')}
                              className="ml-auto text-slate-400 hover:text-slate-700"
                              title="Скопировать"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 w-12 shrink-0">Пароль:</span>
                            <span className="font-mono text-slate-800">
                              {revealed
                                ? revealed.password
                                : password
                                ? '••••••••'
                                : <span className="italic text-slate-400">не задан</span>}
                            </span>
                            {revealed ? (
                              <button
                                onClick={() => setRevealedCreds(prev => {
                                  const { [clientId]: _, ...rest } = prev;
                                  return rest;
                                })}
                                className="ml-auto text-slate-400 hover:text-slate-700"
                                title="Скрыть"
                              >
                                <EyeOff size={12} />
                              </button>
                            ) : (
                              <button
                                onClick={() => setRevealedCreds(prev => ({
                                  ...prev,
                                  [clientId]: { email: email, password: password || '' }
                                }))}
                                disabled={!password}
                                className="ml-auto text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                title="Показать"
                              >
                                <Eye size={12} />
                              </button>
                            )}
                            {(revealed || password) && (
                              <button
                                onClick={() => copyToClipboard(revealed?.password || password, 'Пароль')}
                                className="text-slate-400 hover:text-slate-700"
                                title="Скопировать"
                              >
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            <button
                              onClick={() => handleResetCredentials(clientId)}
                              disabled={busyClientId === clientId}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                            >
                              <RefreshCw size={10} />
                              <span>Новый пароль</span>
                            </button>
                            <button
                              onClick={() => handleUnlock(clientId)}
                              disabled={busyClientId === clientId}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                              title="Снять блокировку после 5 неверных попыток входа"
                            >
                              <Unlock size={10} />
                              <span>Разблокировать</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                        {lic.plan?.name || 'Custom'}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          lic.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lic.status === 'revoked'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {lic.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium align-top">
                      {lic.activation_count} / {lic.max_activations}
                    </td>
                    <td className="py-3 px-4 text-slate-600 align-top">
                      {lic.subscription?.expires_at ? formatDate(lic.subscription.expires_at) : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right align-top">
                      {lic.status === 'active' ? (
                        <button
                          onClick={() => handleRevoke(lic.id)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 p-1"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Archived</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {licenses.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No license keys match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Generate License Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generate New License Key">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Client</label>
            <select
              value={newLicenseData.clientId}
              onChange={e => setNewLicenseData({ ...newLicenseData, clientId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Subscription Plan</label>
            <select
              value={newLicenseData.planId}
              onChange={e => setNewLicenseData({ ...newLicenseData, planId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type}) - ${p.price}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Max Devices</label>
              <input
                type="number"
                min="1"
                max="50"
                value={newLicenseData.maxActivations}
                onChange={e => setNewLicenseData({ ...newLicenseData, maxActivations: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Validity (Days)</label>
              <input
                type="number"
                min="1"
                max="730"
                value={newLicenseData.daysValid}
                onChange={e => setNewLicenseData({ ...newLicenseData, daysValid: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Issue Key
            </Button>
          </div>
        </form>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}
    </div>
  );
};
