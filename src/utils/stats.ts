// src/utils/stats.ts
// СЧИТАЕМ ВЫРУЧКУ, СРЕДНИЙ ЧЕК, БАЛАНС И ГРАФИК ИЗ РЕАЛЬНЫХ ЗАКАЗОВ
import type { Order } from '../types/order';
import { isCash } from '../types/order';

export type PeriodKey = 'today' | 'week' | 'month' | 'all';

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'Сегодня',
  week: '7 дней',
  month: '30 дней',
  all: 'Всё время',
};

export const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const isSameDay = (a: string | Date, b: string | Date) => {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
};

// ТОЛЬКО ОПЛАЧЕННЫЕ ЗАКАЗЫ ИДУТ В ДЕНЬГИ
export const paidOrders = (orders: Order[]) => orders.filter((o) => o.status === 'completed');

export const filterByPeriod = (orders: Order[], period: PeriodKey) => {
  if (period === 'all') return orders;
  const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;
  const from = startOfDay(new Date());
  from.setDate(from.getDate() - (days - 1));
  return orders.filter((o) => new Date(o.date) >= from);
};

export const ordersOfDay = (orders: Order[], day: Date) =>
  orders.filter((o) => isSameDay(o.date, day));

export const revenue = (orders: Order[]) =>
  paidOrders(orders).reduce((sum, o) => sum + o.total, 0);

export const averageCheck = (orders: Order[]) => {
  const paid = paidOrders(orders);
  return paid.length === 0 ? 0 : revenue(paid) / paid.length;
};

export const cashTotal = (orders: Order[]) =>
  paidOrders(orders)
    .filter((o) => isCash(o.paymentMethod))
    .reduce((sum, o) => sum + o.total, 0);

export const cashlessTotal = (orders: Order[]) =>
  paidOrders(orders)
    .filter((o) => !isCash(o.paymentMethod))
    .reduce((sum, o) => sum + o.total, 0);

export const refundedTotal = (orders: Order[]) =>
  orders.filter((o) => o.status === 'refunded').reduce((sum, o) => sum + o.total, 0);

// УНИКАЛЬНЫЕ КЛИЕНТЫ (ГОСТЬ НЕ СЧИТАЕТСЯ ИМЕНЕМ)
export const uniqueCustomers = (orders: Order[]) =>
  new Set(
    orders
      .map((o) => (o.customerName || '').trim())
      .filter((name) => name && name.toLowerCase() !== 'гость'),
  ).size;

export const itemsCount = (order: Order) =>
  order.items.reduce((sum, it) => sum + it.quantity, 0);

// ПРОДАЖИ ПО ДНЯМ ДЛЯ ГРАФИКА
export const salesByDay = (orders: Order[], days = 7) => {
  const result: { date: string; label: string; sales: number; orders: number }[] = [];
  const today = startOfDay(new Date());

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const dayOrders = ordersOfDay(orders, day);
    result.push({
      date: day.toISOString(),
      label: `${String(day.getDate()).padStart(2, '0')}.${String(day.getMonth() + 1).padStart(2, '0')}`,
      sales: revenue(dayOrders),
      orders: paidOrders(dayOrders).length,
    });
  }

  return result;
};
