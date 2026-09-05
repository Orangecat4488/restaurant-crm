import { Link } from 'react-router-dom';
import { ShoppingBag, DollarSign, Users, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useOrdersStore } from '../store/ordersStore';
import { useAuthStore } from '../store/authStore';
import { STATUS_BADGE, STATUS_LABELS, PAYMENT_LABELS } from '../types/order';
import { formatDate, formatShort, formatSum, formatTime } from '../utils/format';
import { formatChange, getGreeting } from '../utils/format';
import {
  averageCheck,
  cashTotal,
  cashlessTotal,
  ordersOfDay,
  paidOrders,
  revenue,
  salesByDay,
  uniqueCustomers,
} from '../utils/stats';

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, change, icon }: StatCardProps) {
  const positive = !change.startsWith('-');
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="text-muted" style={{ fontSize: '12px', marginBottom: '8px' }}>
            {title}
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>{value}</p>
          <p
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: positive ? '#10B981' : '#EF4444',
              margin: 0,
            }}
          >
            {change} vs вчера
          </p>
        </div>
        {/* Добавил лёгкий фиолетовый градиент для иконок, чтобы выделялось */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(91,107,255,0.15), rgba(170,59,255,0.1))',
            padding: '10px',
            borderRadius: '12px',
            color: 'var(--primary)',
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const orders = useOrdersStore((s) => s.orders);
  const currentUser = useAuthStore((s) => s.currentUser);

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const todayOrders = ordersOfDay(orders, today);
  const yesterdayOrders = ordersOfDay(orders, yesterday);

  // ПЛИТКИ СЧИТАЕМ ПО РЕАЛЬНЫМ ЗАКАЗАМ
  const todayCount = paidOrders(todayOrders).length;
  const yesterdayCount = paidOrders(yesterdayOrders).length;
  const todayRevenue = revenue(todayOrders);
  const yesterdayRevenue = revenue(yesterdayOrders);
  const todayAverage = averageCheck(todayOrders);
  const yesterdayAverage = averageCheck(yesterdayOrders);
  const todayCustomers = uniqueCustomers(paidOrders(todayOrders));
  const yesterdayCustomers = uniqueCustomers(paidOrders(yesterdayOrders));

  // БАЛАНС ЗА ВСЁ ВРЕМЯ
  const balanceTotal = revenue(orders);
  const balanceCash = cashTotal(orders);
  const balanceCashless = cashlessTotal(orders);

  const chartData = salesByDay(orders, 7);

  const lastOrders = [...orders]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          {getGreeting()}, {currentUser?.name || 'Гость'}!
        </h1>
        <p style={{ color: '#6b7280' }}>Вот что происходит в вашем ресторане сегодня.</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '32px' }}>
        <StatCard
          title="Заказы сегодня"
          value={todayCount}
          change={formatChange(todayCount, yesterdayCount)}
          icon={<ShoppingBag size={32} />}
        />
        <StatCard
          title="Выручка за день"
          value={formatShort(todayRevenue)}
          change={formatChange(todayRevenue, yesterdayRevenue)}
          icon={<DollarSign size={32} />}
        />
        <StatCard
          title="Средний чек"
          value={formatShort(todayAverage)}
          change={formatChange(todayAverage, yesterdayAverage)}
          icon={<TrendingUp size={32} />}
        />
        <StatCard
          title="Новые клиенты"
          value={todayCustomers}
          change={formatChange(todayCustomers, yesterdayCustomers)}
          icon={<Users size={32} />}
        />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: '32px' }}>
        <div className="card">
          <h2 className="card-header">График продаж</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(value: number) => formatShort(value)} width={80} />
              <Tooltip
                formatter={(value) => [formatSum(Number(value)), 'Выручка']}
                labelFormatter={(label) => `Дата: ${String(label)}`}
              />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#5B6BFF"
                strokeWidth={2}
                dot={{ fill: '#5B6BFF' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="card-header">Баланс</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <p className="text-muted" style={{ fontSize: '12px', marginBottom: '8px' }}>
                Общий баланс
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>
                {formatShort(balanceTotal)}
              </p>
            </div>
            <div style={{ paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <p className="text-muted" style={{ fontSize: '12px', marginBottom: '8px' }}>
                Наличные
              </p>
              <p style={{ fontSize: '18px', fontWeight: '600' }}>{formatShort(balanceCash)}</p>
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: '12px', marginBottom: '8px' }}>
                Безналичные
              </p>
              <p style={{ fontSize: '18px', fontWeight: '600' }}>{formatShort(balanceCashless)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 className="card-header" style={{ margin: 0 }}>
            Последние заказы
          </h2>
          <Link to="/orders" style={{ color: 'var(--primary)', fontWeight: '600' }}>
            Все →
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Дата</th>
                <th>Клиент</th>
                <th>Оплата</th>
                <th>Сумма</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {lastOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#6b7280' }}>
                    Заказов пока нет
                  </td>
                </tr>
              ) : (
                lastOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.number}</td>
                    <td>
                      {formatDate(order.date)}{' '}
                      <span className="text-muted" style={{ fontSize: '11px' }}>
                        {formatTime(order.date)}
                      </span>
                    </td>
                    <td>{order.customerName || 'Гость'}</td>
                    <td style={{ fontSize: '13px' }}>{PAYMENT_LABELS[order.paymentMethod]}</td>
                    <td style={{ fontWeight: '600' }}>{formatSum(order.total)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
