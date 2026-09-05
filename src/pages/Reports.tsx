import { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Users, Package, Download,
  DollarSign, ShoppingBag
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useOrdersStore } from '../store/ordersStore';
import { formatSum, formatDate } from '../utils/format';
import {
  revenue, cashTotal, cashlessTotal, paidOrders,
  salesByDay, averageCheck, itemsCount, filterByPeriod
} from '../utils/stats';
import type { PeriodKey } from '../utils/stats';
import { PAYMENT_LABELS } from '../types/order';

const COLORS = ['#5B6BFF', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'all', label: 'Всё время' },
];

export default function Reports() {
  const orders = useOrdersStore((s) => s.orders);
  const [period, setPeriod] = useState<PeriodKey>('week');
  const [reportType, setReportType] = useState<'sales' | 'products' | 'cashiers' | 'payments'>('sales');

  // ФИЛЬТРАЦИЯ ПО ПЕРИОДУ
  const filteredOrders = useMemo(() => filterByPeriod(orders, period), [orders, period]);
  const completedOrders = useMemo(() => paidOrders(filteredOrders), [filteredOrders]);

  // ОБЩАЯ СТАТИСТИКА
  const stats = useMemo(() => ({
    totalRevenue: revenue(completedOrders),
    cashRevenue: cashTotal(completedOrders),
    cashlessRevenue: cashlessTotal(completedOrders),
    ordersCount: completedOrders.length,
    avgCheck: averageCheck(completedOrders),
    itemsSold: completedOrders.reduce((sum, o) => sum + itemsCount(o), 0),
  }), [completedOrders]);

  // ПРОДАЖИ ПО ДНЯМ
  const chartData = useMemo(() => salesByDay(orders, period === 'today' ? 1 : period === 'week' ? 7 : 30), [orders, period]);

  // РАСПРЕДЕЛЕНИЕ ПО ТИПАМ ОПЛАТЫ
  const paymentData = useMemo(() => {
    const byPayment: Record<string, number> = {};
    completedOrders.forEach((o) => {
      byPayment[o.paymentMethod] = (byPayment[o.paymentMethod] || 0) + o.total;
    });
    return Object.entries(byPayment).map(([method, amount]) => ({
      name: PAYMENT_LABELS[method as keyof typeof PAYMENT_LABELS] || method,
      value: amount,
    }));
  }, [completedOrders]);

  // ТОП ТОВАРОВ
  const topProducts = useMemo(() => {
    const productSales: Record<string, { quantity: number; revenue: number; name: string }> = {};
    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { quantity: 0, revenue: 0, name: item.name };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.total;
      });
    });
    return Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [completedOrders]);

  // ПРОДАЖИ ПО КАССИРАМ
  const cashierStats = useMemo(() => {
    const byCashier: Record<string, { orders: number; revenue: number; cash: number; cashless: number }> = {};
    completedOrders.forEach((order) => {
      const name = order.cashier || 'Неизвестно';
      if (!byCashier[name]) {
        byCashier[name] = { orders: 0, revenue: 0, cash: 0, cashless: 0 };
      }
      byCashier[name].orders++;
      byCashier[name].revenue += order.total;
      if (order.paymentMethod === 'cash') {
        byCashier[name].cash += order.total;
      } else {
        byCashier[name].cashless += order.total;
      }
    });
    return Object.entries(byCashier)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [completedOrders]);

  // ЭКСПОРТ В CSV
  const exportToCSV = () => {
    let csv = '';
    const filename = `report-${period}-${new Date().toISOString().split('T')[0]}.csv`;

    if (reportType === 'sales') {
      csv = 'Дата,Номер заказа,Клиент,Оплата,Сумма\n';
      completedOrders.forEach((o) => {
        csv += `${formatDate(o.date)},${o.number},${o.customerName || 'Гость'},${PAYMENT_LABELS[o.paymentMethod]},${o.total}\n`;
      });
    } else if (reportType === 'products') {
      csv = 'Товар,Количество,Выручка\n';
      topProducts.forEach((p) => {
        csv += `${p.name},${p.quantity},${p.revenue}\n`;
      });
    } else if (reportType === 'cashiers') {
      csv = 'Кассир,Заказов,Выручка,Наличные,Безналичные\n';
      cashierStats.forEach((c) => {
        csv += `${c.name},${c.orders},${c.revenue},${c.cash},${c.cashless}\n`;
      });
    }

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ЗАГОЛОВОК */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>
          Отчёты
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          Аналитика продаж и статистика
        </p>
      </div>

      {/* ФИЛЬТРЫ */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`btn btn-${period === p.key ? 'primary' : 'secondary'}`}
            style={{ fontSize: '13px', padding: '8px 14px' }}
          >
            {p.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={exportToCSV}
          className="btn btn-secondary"
          style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Download size={14} /> Экспорт CSV
        </button>
      </div>

      {/* ОБЩАЯ СТАТИСТИКА */}
      <div className="grid grid-4" style={{ marginBottom: '20px' }}>
        <StatCard
          title="Выручка"
          value={formatSum(stats.totalRevenue)}
          icon={<DollarSign size={24} />}
          color="#10B981"
        />
        <StatCard
          title="Заказов"
          value={String(stats.ordersCount)}
          icon={<ShoppingBag size={24} />}
          color="#5B6BFF"
        />
        <StatCard
          title="Средний чек"
          value={formatSum(stats.avgCheck)}
          icon={<TrendingUp size={24} />}
          color="#8B5CF6"
        />
        <StatCard
          title="Продано товаров"
          value={String(stats.itemsSold)}
          icon={<Package size={24} />}
          color="#F59E0B"
        />
      </div>

      {/* ТАБЫ ОТЧЁТОВ */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
        {[
          { key: 'sales', label: 'Продажи', icon: <BarChart3 size={16} /> },
          { key: 'products', label: 'Товары', icon: <Package size={16} /> },
          { key: 'cashiers', label: 'Кассиры', icon: <Users size={16} /> },
          { key: 'payments', label: 'Оплаты', icon: <CreditCard size={16} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setReportType(tab.key as typeof reportType)}
            className={`btn btn-${reportType === tab.key ? 'primary' : 'secondary'}`}
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* КОНТЕНТ ОТЧЁТОВ */}
      {reportType === 'sales' && (
        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* ГРАФИК ПРОДАЖ */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, marginBottom: '16px' }}>
              Динамика продаж
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => formatSum(v)} width={80} />
                <Tooltip formatter={(v) => [formatSum(Number(v)), 'Выручка']} />
                <Bar dataKey="sales" fill="#5B6BFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* СВОДКА */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, marginBottom: '16px' }}>
              Сводка
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SummaryRow label="Наличные" value={formatSum(stats.cashRevenue)} color="#F59E0B" />
              <SummaryRow label="Безналичные" value={formatSum(stats.cashlessRevenue)} color="#8B5CF6" />
              <SummaryRow label="Выручка" value={formatSum(stats.totalRevenue)} color="#10B981" bold />
            </div>
          </div>
        </div>
      )}

      {reportType === 'products' && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, marginBottom: '16px' }}>
            Топ-10 товаров по выручке
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Товар</th>
                  <th>Количество</th>
                  <th>Выручка</th>
                  <th>Доля</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => {
                  const percent = stats.totalRevenue > 0 ? (p.revenue / stats.totalRevenue * 100).toFixed(1) : '0';
                  return (
                    <tr key={p.id}>
                      <td style={{ width: '40px' }}>{i + 1}</td>
                      <td style={{ fontWeight: '500' }}>{p.name}</td>
                      <td>{p.quantity} шт</td>
                      <td style={{ fontWeight: '600' }}>{formatSum(p.revenue)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: `${Math.min(100, Number(percent))}%`,
                            height: '8px',
                            background: COLORS[i % COLORS.length],
                            borderRadius: '4px',
                            minWidth: '8px',
                          }} />
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>{percent}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'cashiers' && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, marginBottom: '16px' }}>
            Статистика по кассирам
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Кассир</th>
                  <th>Заказов</th>
                  <th>Выручка</th>
                  <th>Наличные</th>
                  <th>Безналичные</th>
                  <th>Средний чек</th>
                </tr>
              </thead>
              <tbody>
                {cashierStats.map((c) => (
                  <tr key={c.name}>
                    <td style={{ fontWeight: '500' }}>{c.name}</td>
                    <td>{c.orders}</td>
                    <td style={{ fontWeight: '600', color: '#10B981' }}>{formatSum(c.revenue)}</td>
                    <td>{formatSum(c.cash)}</td>
                    <td>{formatSum(c.cashless)}</td>
                    <td>{formatSum(Math.round(c.revenue / c.orders))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'payments' && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* КРУГОВАЯ ДИАГРАММА */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, marginBottom: '16px' }}>
              По типу оплаты
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {paymentData.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatSum(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* ТАБЛИЦА */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, marginBottom: '16px' }}>
              Детализация
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paymentData.map((p, i) => (
                <div key={p.name} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: '#F9FAFB',
                  borderRadius: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: COLORS[i % COLORS.length],
                    }} />
                    <span style={{ fontWeight: '500' }}>{p.name}</span>
                  </div>
                  <span style={{ fontWeight: '600', fontSize: '16px' }}>{formatSum(p.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// КОМПОНЕНТЫ
function StatCard({ title, value, icon, color }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="text-muted" style={{ fontSize: '12px', margin: 0, marginBottom: '8px' }}>{title}</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{value}</p>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(91,107,255,0.15), rgba(170,59,255,0.1))',
          padding: '12px',
          borderRadius: '12px',
          color: color || 'var(--primary)',
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, color, bold }: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#6b7280', fontSize: '13px' }}>{label}</span>
      <span style={{ fontWeight: bold ? 'bold' : '600', color: color || 'inherit', fontSize: bold ? '18px' : '14px' }}>
        {value}
      </span>
    </div>
  );
}

function CreditCard({ size }: { size: number }) {
  return <div style={{ width: size, height: size * 0.6, border: '2px solid currentColor', borderRadius: 4 }} />;
}
