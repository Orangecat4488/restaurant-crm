import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order, OrderStatus } from '../types/order';
import { seedOrders } from '../data/seedOrders';

interface OrdersStore {
  orders: Order[];
  lastNumber: number;

  addOrder: (order: Order) => void;
  setStatus: (orderId: string, status: OrderStatus) => void;
  refundOrder: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  markPrinted: (orderId: string) => void;
  removeOrder: (orderId: string) => void;
  resetDemo: () => void;

  getOrder: (orderId: string) => Order | undefined;
  nextNumber: () => number;
}

const initial = seedOrders();
const initialLastNumber = initial.reduce((max, o) => Math.max(max, o.number), 7280000);

export const useOrdersStore = create<OrdersStore>()(
  persist(
    (set, get) => ({
      orders: initial,
      lastNumber: initialLastNumber,

      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders],
          lastNumber: Math.max(state.lastNumber, order.number),
        })),

      setStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
        })),

      refundOrder: (orderId) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: 'refunded' as OrderStatus } : o,
          ),
        })),

      cancelOrder: (orderId) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: 'cancelled' as OrderStatus } : o,
          ),
        })),

      // КАЖДАЯ ПЕЧАТЬ ПОСЛЕ ПЕРВОЙ — КОПИЯ ЧЕКА
      markPrinted: (orderId) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, printCount: o.printCount + 1 } : o,
          ),
        })),

      removeOrder: (orderId) =>
        set((state) => ({ orders: state.orders.filter((o) => o.id !== orderId) })),

      resetDemo: () => {
        const demo = seedOrders();
        set({
          orders: demo,
          lastNumber: demo.reduce((max, o) => Math.max(max, o.number), 7280000),
        });
      },

      getOrder: (orderId) => get().orders.find((o) => o.id === orderId),

      nextNumber: () => get().lastNumber + 1,
    }),
    { name: 'restaurant-crm-orders' },
  ),
);
