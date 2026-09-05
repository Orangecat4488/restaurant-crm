// src/data/seedOrders.ts
// ДЕМО-ЗАКАЗЫ ЗА ПОСЛЕДНИЕ 7 ДНЕЙ, ЧТОБЫ ЧЕКИ И ОТЧЁТЫ НЕ БЫЛИ ПУСТЫМИ
import { products } from './products';
import type { Order, OrderItem, OrderStatus, OrderType, PaymentMethod } from '../types/order';

const PAYMENTS: PaymentMethod[] = ['cash', 'card', 'click', 'payme', 'uzumbank'];
const TYPES: OrderType[] = ['dine-in', 'dine-in', 'dine-in', 'takeaway', 'delivery'];
const CASHIERS = ['Иван Петров', 'Алина Юсупова', 'Дилшод Каримов'];
const GUESTS = ['Гость', 'Азиз', 'Марина', 'Сергей', 'Нигора', 'Тимур', 'Ольга'];

// ПРОСТОЙ ГЕНЕРАТОР — ОДИНАКОВЫЕ ДЕМО-ДАННЫЕ ПРИ КАЖДОМ ЗАПУСКЕ
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function seedOrders(count = 46): Order[] {
  const random = makeRandom(20250827);
  const active = products.filter((p) => p.isActive);
  const orders: Order[] = [];

  const now = new Date();
  // СЕГОДНЯ ЗАКАЗОВ БОЛЬШЕ, ЧЕМ В ПРОШЛЫЕ ДНИ
  const dayWeights = [0.22, 0.15, 0.14, 0.13, 0.12, 0.12, 0.12];

  for (let i = 0; i < count; i++) {
    // ВЫБИРАЕМ ДЕНЬ ПО ВЕСАМ: 0 — СЕГОДНЯ, 6 — ШЕСТЬ ДНЕЙ НАЗАД
    let roll = random();
    let daysAgo = 0;
    for (let d = 0; d < dayWeights.length; d++) {
      if (roll < dayWeights[d]) {
        daysAgo = d;
        break;
      }
      roll -= dayWeights[d];
      daysAgo = d;
    }

    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    // РАБОЧИЕ ЧАСЫ 11:00–23:00, НО НЕ ПОЗЖЕ ТЕКУЩЕГО ВРЕМЕНИ ДЛЯ СЕГОДНЯ
    const hour = 11 + Math.floor(random() * 12);
    date.setHours(
      daysAgo === 0 ? Math.min(hour, Math.max(11, now.getHours())) : hour,
      Math.floor(random() * 60),
      0,
      0,
    );

    // ПОЗИЦИИ ЗАКАЗА
    const itemCount = 2 + Math.floor(random() * 5);
    const items: OrderItem[] = [];
    for (let j = 0; j < itemCount; j++) {
      const product = active[Math.floor(random() * active.length)];
      if (items.some((it) => it.productId === product.id)) continue;
      const quantity = 1 + Math.floor(random() * 3);
      items.push({
        id: `${product.id}-${i}-${j}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        total: product.price * quantity,
      });
    }
    if (items.length === 0) continue;

    const orderType = TYPES[Math.floor(random() * TYPES.length)];
    const paymentMethod = PAYMENTS[Math.floor(random() * PAYMENTS.length)];

    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    const discountPercent = random() < 0.25 ? [5, 10, 15][Math.floor(random() * 3)] : 0;
    const discount = Math.round((subtotal * discountPercent) / 100);
    // ОБСЛУЖИВАНИЕ ТОЛЬКО В ЗАЛЕ
    const serviceChargePercent = orderType === 'dine-in' ? 10 : 0;
    const serviceCharge = Math.round(((subtotal - discount) * serviceChargePercent) / 100);
    const total = subtotal - discount + serviceCharge;

    // ПАРА ОТМЕН И ВОЗВРАТОВ ДЛЯ РЕАЛИСТИЧНОСТИ
    const statusRoll = random();
    const status: OrderStatus =
      statusRoll > 0.96 ? 'cancelled' : statusRoll > 0.92 ? 'refunded' : 'completed';

    // НАЛИЧНЫМИ ОКРУГЛЯЮТ ВВЕРХ ДО 5000, ОСТАЛЬНОЕ — БЕЗ СДАЧИ
    const paidAmount =
      paymentMethod === 'cash' ? Math.ceil(total / 5000) * 5000 : total;

    orders.push({
      id: `ORD-${date.getTime()}-${i}`,
      number: 7280000 + i + 1,
      receiptNumber: String(i + 1).padStart(6, '0'),
      date: date.toISOString(),
      items,
      subtotal,
      discountPercent,
      discount,
      serviceChargePercent,
      serviceCharge,
      total,
      paidAmount,
      changeAmount: paidAmount - total,
      paymentMethod,
      status,
      orderType,
      tableNumber: orderType === 'dine-in' ? 1 + Math.floor(random() * 20) : null,
      guests: orderType === 'dine-in' ? 1 + Math.floor(random() * 6) : 1,
      customerName: GUESTS[Math.floor(random() * GUESTS.length)],
      cashier: CASHIERS[Math.floor(random() * CASHIERS.length)],
      printCount: 1,
    });
  }

  // НОВЫЕ СВЕРХУ
  return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
