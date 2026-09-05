import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/data-source';
import { CryptoUtil } from '../../utils/crypto';
import { License } from '../../database/entities';

export class AdminService {
  async getDashboardMetrics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Revenue calculations
    const completedPayments = db.payments.filter(p => p.status === 'completed');
    
    const revenueMTD = completedPayments
      .filter(p => new Date(p.created_at) >= startOfMonth)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const revenueYTD = completedPayments
      .filter(p => new Date(p.created_at) >= startOfYear)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalRevenue = completedPayments
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Subscriptions count
    const activeSubscriptions = db.subscriptions.filter(s => s.status === 'active' && new Date(s.expires_at) > now).length;
    const expiredSubscriptions = db.subscriptions.filter(s => s.status === 'expired' || new Date(s.expires_at) <= now).length;
    const pendingSubscriptions = db.subscriptions.filter(s => s.status === 'pending').length;

    // Clients count
    const totalClients = db.clients.length;
    const newClientsMonth = db.clients.filter(c => new Date(c.created_at) >= startOfMonth).length;

    // Licenses count
    const totalLicenses = db.licenses.length;
    const activeLicenses = db.licenses.filter(l => l.status === 'active').length;
    const revokedLicenses = db.licenses.filter(l => l.status === 'revoked').length;

    // Payment breakdown
    const paymentBreakdown = {
      completed: db.payments.filter(p => p.status === 'completed').length,
      pending: db.payments.filter(p => p.status === 'pending').length,
      failed: db.payments.filter(p => p.status === 'failed').length,
      refunded: db.payments.filter(p => p.status === 'refunded').length
    };

    // Revenue chart (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueChart = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const mRevenue = completedPayments
        .filter(p => new Date(p.created_at) >= mStart && new Date(p.created_at) <= mEnd)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const mSubscriptions = db.subscriptions
        .filter(s => new Date(s.created_at) >= mStart && new Date(s.created_at) <= mEnd).length;

      revenueChart.push({
        month: months[d.getMonth()],
        revenue: mRevenue,
        subscriptions: mSubscriptions
      });
    }

    // Recent activity
    const recentAuditLogs = db.auditLogs.slice(0, 10);

    return {
      revenueMTD,
      revenueYTD,
      totalRevenue,
      activeSubscriptions,
      expiredSubscriptions,
      pendingSubscriptions,
      totalClients,
      newClientsMonth,
      totalLicenses,
      activeLicenses,
      revokedLicenses,
      paymentBreakdown,
      revenueChart,
      recentAuditLogs
    };
  }

  async getClients() {
    return db.clients.map(client => {
      const user = db.users.find(u => u.id === client.user_id);
      const clientSubs = db.subscriptions.filter(s => s.client_id === client.id);
      const clientPayments = db.payments.filter(p => clientSubs.some(s => s.id === p.subscription_id) && p.status === 'completed');
      const totalSpent = clientPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      const activeSub = clientSubs.find(s => s.status === 'active' && new Date(s.expires_at) > new Date());
      const activePlan = activeSub ? db.plans.find(p => p.id === activeSub.plan_id) : null;

      return {
        id: client.id,
        userId: user?.id,
        companyName: client.company_name,
        contactName: user ? `${user.first_name} ${user.last_name}` : 'N/A',
        email: user?.email || '',
        password: user?.original_password || null,
        phone: client.phone || 'N/A',
        city: client.city || 'N/A',
        status: user?.status || 'active',
        activePlan: activePlan?.name || 'No active plan',
        totalSpent,
        subscriptionsCount: clientSubs.length,
        createdAt: client.created_at
      };
    });
  }

  async getClientDetail(id: string) {
    const client = db.clients.find(c => c.id === id);
    if (!client) throw new Error('Client not found');

    const user = db.users.find(u => u.id === client.user_id);
    const subscriptions = db.subscriptions.filter(s => s.client_id === client.id).map(s => {
      const plan = db.plans.find(p => p.id === s.plan_id);
      const license = db.licenses.find(l => l.subscription_id === s.id);
      return { ...s, plan, license };
    });

    const subIds = subscriptions.map(s => s.id);
    const payments = db.payments.filter(p => subIds.includes(p.subscription_id));

    return {
      client,
      user: user ? {
        id: user.id,
        email: user.email,
        password: user.original_password || null,
        firstName: user.first_name,
        lastName: user.last_name,
        status: user.status
      } : null,
      subscriptions,
      payments
    };
  }

  async toggleClientStatus(clientId: string, status: 'active' | 'suspended') {
    const client = db.clients.find(c => c.id === clientId);
    if (!client) throw new Error('Client not found');
    const user = db.users.find(u => u.id === client.user_id);
    if (user) {
      user.status = status;
      user.updated_at = new Date();
    }
    return { success: true, clientId, status };
  }

  async bulkGenerateLicenses(data: { count: number; planId?: string; maxActivations?: number; daysValid?: number }) {
    const generated: License[] = [];
    const count = Math.min(Math.max(1, data.count || 5), 100);

    for (let i = 0; i < count; i++) {
      const key = CryptoUtil.generateLicenseKey();
      const license: License = {
        id: uuidv4(),
        subscription_id: '',
        key,
        activation_count: 0,
        max_activations: data.maxActivations || 5,
        last_validated_at: null,
        device_fingerprint: null,
        ip_address: null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };
      db.licenses.push(license);
      generated.push(license);
    }

    await db.createAuditLog({
      action: 'BULK_LICENSES_GENERATED',
      resourceType: 'license',
      changes: { count, keys: generated.map(l => l.key) }
    });

    return {
      success: true,
      count: generated.length,
      keys: generated.map(l => l.key),
      licenses: generated
    };
  }

  async getReports() {
    const now = new Date();
    const totalSubs = db.subscriptions.length;
    const activeSubs = db.subscriptions.filter(s => s.status === 'active' && new Date(s.expires_at) > now).length;
    const cancelledSubs = db.subscriptions.filter(s => s.status === 'cancelled').length;

    // Churn rate = (cancelled / total) * 100
    const churnRate = totalSubs > 0 ? ((cancelledSubs / totalSubs) * 100).toFixed(1) : '0.0';
    // Retention rate = 100 - churn
    const retentionRate = (100 - parseFloat(churnRate)).toFixed(1);

    // Customer Lifetime Value (LTV)
    const completedPayments = db.payments.filter(p => p.status === 'completed');
    const totalRev = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const uniqueClients = new Set(
      completedPayments.map(p => {
        const sub = db.subscriptions.find(s => s.id === p.subscription_id);
        return sub ? sub.client_id : null;
      }).filter(Boolean)
    ).size;

    const averageLTV = uniqueClients > 0 ? (totalRev / uniqueClients).toFixed(2) : '0.00';

    // Revenue by plan type
    const planBreakdown: Record<string, { count: number; revenue: number }> = {};
    for (const plan of db.plans) {
      const planSubs = db.subscriptions.filter(s => s.plan_id === plan.id).map(s => s.id);
      const planPayments = db.payments.filter(p => planSubs.includes(p.subscription_id) && p.status === 'completed');
      const rev = planPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      planBreakdown[plan.name] = { count: planSubs.length, revenue: rev };
    }

    return {
      churnRate: `${churnRate}%`,
      retentionRate: `${retentionRate}%`,
      averageLTV: `$${averageLTV}`,
      totalRevenue: totalRev,
      planBreakdown
    };
  }

  async getAnalytics() {
    return {
      deviceDistribution: [
        { type: 'Windows POS Terminal', count: 42, percentage: 55 },
        { type: 'Linux / Ubuntu Server', count: 20, percentage: 26 },
        { type: 'macOS Management Hub', count: 14, percentage: 19 }
      ],
      geography: [
        { country: 'United States', count: 38 },
        { country: 'United Kingdom', count: 18 },
        { country: 'Germany', count: 12 },
        { country: 'Kazakhstan', count: 8 }
      ],
      systemHealth: {
        apiLatencyMs: 24,
        uptime: '99.98%',
        dbStatus: 'healthy',
        activeConnections: 12
      }
    };
  }
}

export const adminService = new AdminService();
