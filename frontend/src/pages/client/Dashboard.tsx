import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { subscriptionService } from '../../services/subscriptionService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatDate, maskLicenseKey, getDaysRemaining } from '../../utils/formatter';
import { Link } from 'react-router-dom';

export const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const subs = await subscriptionService.getMySubscriptions();
      setSubscriptions(subs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleShowKey = (id: string) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2500);
  };

  const handleRenew = async (id: string) => {
    await subscriptionService.renew(id);
    loadData();
  };

  const activeSub = subscriptions.find(s => s.status === 'active') || subscriptions[0];
  const daysLeft = activeSub ? getDaysRemaining(activeSub.expires_at) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome, {user?.firstName || 'Restaurant Owner'}!
          </h2>
          <p className="text-sm text-slate-500">
            {user?.client?.companyName || 'Restaurant'} • POS License & Subscriptions Hub
          </p>
        </div>
        <Link to="/client/subscription">
          <Button variant="outline" size="sm">Manage Subscriptions</Button>
        </Link>
      </div>

      {/* Warning Alert if expiring soon (< 7 days) */}
      {activeSub && daysLeft <= 7 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-sm">License expires in {daysLeft} day(s)!</p>
              <p className="text-xs text-amber-700">Renew your subscription to avoid interruption of POS terminal service.</p>
            </div>
          </div>
          <Button size="sm" variant="primary" onClick={() => handleRenew(activeSub.id)}>
            Renew Now
          </Button>
        </div>
      )}

      {/* Primary License Key Card */}
      {activeSub ? (
        <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-0 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-3">
                {activeSub.plan?.name} Plan ({activeSub.plan?.type})
              </span>
              <h3 className="text-xl font-bold text-white mb-1">Commercial POS License Key</h3>
              <div className="flex items-center space-x-3 mt-2">
                <span className="font-mono text-xl tracking-wider font-extrabold text-emerald-400 bg-slate-950/80 px-4 py-2 rounded-lg border border-slate-700">
                  {showKey[activeSub.id] ? activeSub.license_key : maskLicenseKey(activeSub.license_key)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleShowKey(activeSub.id)}
                  className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                >
                  {showKey[activeSub.id] ? 'Hide' : 'Reveal'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => copyToClipboard(activeSub.license_key)}
                >
                  {copied === activeSub.license_key ? 'Copied!' : 'Copy Key'}
                </Button>
              </div>
            </div>

            <div className="text-right md:border-l md:border-slate-700 md:pl-6">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Validity Status</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {daysLeft} Days Remaining
              </span>
              <span className="text-xs text-slate-400 block mt-0.5">
                Expires on {formatDate(activeSub.expires_at)}
              </span>
              <div className="mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRenew(activeSub.id)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Extend / Renew
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="text-center py-10">
          <span className="text-4xl block mb-2">🍽️</span>
          <h3 className="text-lg font-bold text-slate-900">No Active Subscription</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mt-1 mb-4">
            Select a subscription plan to unlock full restaurant CRM POS access and receive your commercial license key.
          </p>
          <Link to="/client/subscription">
            <Button variant="primary">Choose a Subscription Plan</Button>
          </Link>
        </Card>
      )}

      {/* POS Terminal Quick Activation Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Quick CLI Activation Guide">
          <p className="text-xs text-slate-500 mb-3">
            Activate this license on your cash register terminal via the command line utility:
          </p>
          <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs space-y-2">
            <p className="text-slate-400"># 1. Install CLI</p>
            <p className="text-emerald-400">npm install -g crm-restaurant-license</p>
            <p className="text-slate-400 mt-2"># 2. Activate with your key</p>
            <p className="text-emerald-400">crm-license activate {activeSub?.license_key || 'XXXX-XXXX-XXXX-XXXX'}</p>
            <p className="text-slate-400 mt-2"># 3. Verify status</p>
            <p className="text-emerald-400">crm-license status</p>
          </div>
        </Card>

        <Card title="Plan Features & Limits">
          <ul className="divide-y divide-slate-100 text-sm space-y-2 pt-1">
            <li className="flex justify-between py-1.5">
              <span className="text-slate-600">Authorized Locations:</span>
              <span className="font-bold text-slate-900">{activeSub?.plan?.max_locations || 1} branch</span>
            </li>
            <li className="flex justify-between py-1.5">
              <span className="text-slate-600">Allowed Terminal Devices:</span>
              <span className="font-bold text-slate-900">{activeSub?.license?.max_activations || 5} POS stations</span>
            </li>
            <li className="flex justify-between py-1.5">
              <span className="text-slate-600">Auto-Renewal:</span>
              <span className="font-bold text-emerald-600">{activeSub?.auto_renew ? 'Enabled' : 'Disabled'}</span>
            </li>
            <li className="flex justify-between py-1.5">
              <span className="text-slate-600">Technical Support:</span>
              <span className="font-bold text-slate-900">{activeSub?.plan?.features?.support || 'Standard'}</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};
