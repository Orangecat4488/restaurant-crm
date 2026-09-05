import React, { useState, useEffect } from 'react';
import { subscriptionService, PlanItem } from '../../services/subscriptionService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatCurrency, formatDate } from '../../utils/formatter';

export const SubscriptionStatus: React.FC = () => {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [availablePlans, subs] = await Promise.all([
        subscriptionService.getPlans(),
        subscriptionService.getMySubscriptions()
      ]);
      setPlans(availablePlans);
      setMySubscriptions(subs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentSub = mySubscriptions.find(s => s.status === 'active') || mySubscriptions[0];

  const handleToggleAutoRenew = async () => {
    if (!currentSub) return;
    await subscriptionService.toggleAutoRenew(currentSub.id, !currentSub.auto_renew);
    loadData();
  };

  const handleCancel = async () => {
    if (!currentSub) return;
    if (!window.confirm('Cancel auto-renew for this subscription? Your license remains valid until expiration.')) return;
    await subscriptionService.cancel(currentSub.id);
    loadData();
  };

  const handleSubscribe = async (planId: string) => {
    await subscriptionService.createSubscription(planId, true);
    setIsUpgradeModalOpen(false);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription Status & Plan</h2>
        <p className="text-sm text-slate-500">Manage plan tier, renew options, and branch expansion</p>
      </div>

      {currentSub ? (
        <Card title="Current Subscription Tier">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center py-4 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-2xl font-black text-slate-900">{currentSub.plan?.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800">
                  {currentSub.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Started: {formatDate(currentSub.activated_at || currentSub.created_at)} • Valid until: {formatDate(currentSub.expires_at)}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleAutoRenew}
              >
                Auto-Renew: {currentSub.auto_renew ? 'ON ✅' : 'OFF ❌'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsUpgradeModalOpen(true)}
              >
                Change Plan
              </Button>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center text-xs text-slate-500">
            <span>Need to pause operations?</span>
            <button onClick={handleCancel} className="text-rose-600 hover:underline font-semibold">
              Cancel Subscription
            </button>
          </div>
        </Card>
      ) : (
        <Card className="text-center py-6">
          <p className="text-sm text-slate-500 mb-3">No active subscription found for your restaurant.</p>
          <Button variant="primary" size="sm" onClick={() => setIsUpgradeModalOpen(true)}>
            Browse Plans
          </Button>
        </Card>
      )}

      {/* Available Plans Catalog */}
      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">Available Restaurant Plans</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => {
          const isCurrent = currentSub?.plan_id === plan.id;
          return (
            <Card key={plan.id} className={`flex flex-col justify-between ${isCurrent ? 'ring-2 ring-emerald-500' : ''}`}>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-lg font-bold text-slate-900">{plan.name}</h4>
                  {isCurrent && (
                    <span className="text-xs bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 min-h-[32px]">{plan.description}</p>
                <div className="my-4">
                  <span className="text-3xl font-black text-slate-900">{formatCurrency(plan.price, plan.currency)}</span>
                  <span className="text-slate-400 text-xs"> / {plan.type}</span>
                </div>

                <ul className="text-xs text-slate-600 space-y-2">
                  <li>📍 {plan.max_locations || 'Unlimited'} location(s)</li>
                  <li>👥 {plan.max_users || 'Unlimited'} user accounts</li>
                  <li>🔑 {plan.type === 'yearly' ? '365' : plan.type === 'half_yearly' ? '180' : '30'} Days License Key</li>
                  <li>🛠️ {plan.features?.support || 'Standard'} Support</li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Button
                  variant={isCurrent ? 'outline' : 'primary'}
                  size="sm"
                  className="w-full"
                  disabled={isCurrent}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {isCurrent ? 'Current Plan' : 'Select Plan'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Change Plan Modal */}
      <Modal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} title="Select Subscription Tier" maxWidth="lg">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Choose a tier to immediately generate or renew your commercial license:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p)}
                className={`p-3 border rounded-xl cursor-pointer transition-all ${
                  selectedPlan?.id === p.id ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="font-bold text-slate-900 block text-sm">{p.name}</span>
                <span className="font-extrabold text-emerald-600 text-base">{formatCurrency(p.price)}</span>
                <span className="text-xs text-slate-400 block">Cycle: {p.type}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsUpgradeModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!selectedPlan}
              onClick={() => selectedPlan && handleSubscribe(selectedPlan.id)}
            >
              Confirm Subscription
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
