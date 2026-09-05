import React, { useState, useEffect } from 'react';
import { subscriptionService, PlanItem } from '../../services/subscriptionService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/formatter';

export const SubscriptionPlans: React.FC = () => {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'monthly' as 'monthly' | 'half_yearly' | 'yearly',
    price: 49.00,
    currency: 'USD',
    maxUsers: 10,
    maxLocations: 2,
    description: '',
    features: { basicReports: true, support: 'Email' }
  });

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await subscriptionService.getAllPlans();
      setPlans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    await subscriptionService.createPlan(formData);
    setIsModalOpen(false);
    loadPlans();
  };

  const handleToggleActive = async (plan: PlanItem) => {
    await subscriptionService.updatePlan(plan.id, { is_active: !plan.is_active });
    loadPlans();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription Plans</h2>
          <p className="text-sm text-slate-500">Configure commercial pricing tiers, licenses duration and POS limits</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          + Create New Tier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <Card key={plan.id} className="flex flex-col justify-between border-t-4 border-t-emerald-500">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded ${
                    plan.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {plan.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-500 min-h-[32px]">{plan.description}</p>

              <div className="mt-4 pb-4 border-b border-slate-100">
                <span className="text-3xl font-black text-slate-900">{formatCurrency(plan.price, plan.currency)}</span>
                <span className="text-slate-500 text-sm">
                  {plan.type === 'yearly' ? ' / year' : plan.type === 'half_yearly' ? ' / 6 months' : ' / month'}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center space-x-2">
                  <span>📍</span>
                  <span>Locations limit: <strong>{plan.max_locations || 'Unlimited'}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>👥</span>
                  <span>User accounts: <strong>{plan.max_users || 'Unlimited'}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🔑</span>
                  <span>License duration: <strong>{plan.type === 'yearly' ? '365 Days' : plan.type === 'half_yearly' ? '180 Days' : '30 Days'}</strong></span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleActive(plan)}
                className="w-full"
              >
                {plan.is_active ? 'Deactivate Tier' : 'Activate Tier'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Plan Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Subscription Plan">
        <form onSubmit={handleCreatePlan} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Plan Name</label>
            <input
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. VIP Multi-Chain"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Billing Cycle</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="monthly">Monthly (30 days)</option>
                <option value="half_yearly">Half-Yearly (180 days)</option>
                <option value="yearly">Yearly (365 days)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Max Users</label>
              <input
                type="number"
                value={formData.maxUsers}
                onChange={e => setFormData({ ...formData, maxUsers: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Max Locations</label>
              <input
                type="number"
                value={formData.maxLocations}
                onChange={e => setFormData({ ...formData, maxLocations: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Features description..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Plan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
