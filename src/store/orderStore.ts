import { create } from 'zustand';
import type { Order, OrderItem, OrderType, PaymentMethod } from '../types/order';
import { useOrdersStore } from './ordersStore';
import { useStockStore } from './stockStore';
import { useAuthStore } from './authStore';
import { useShiftStore } from './shiftStore';

// ТЕКУЩИЙ ЗАКАЗ НА КАССЕ (КОРЗИНА)
interface OrderStore {
  currentOrder: OrderItem[];
  discount: number;
  discountPercent: number;
  serviceChargePercent: number;
  paymentMethod: PaymentMethod;
  orderType: OrderType;
  tableNumber: number | null;
  guests: number;
  customerName: string;
  customerPhone: string;
  comment: string;
  paidAmount: number;

  addItem: (item: OrderItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (discount: number) => void;
  setDiscountPercent: (percent: number) => void;
  setServiceChargePercent: (percent: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setOrderType: (type: OrderType) => void;
  setTableNumber: (table: number | null) => void;
  setGuests: (guests: number) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setComment: (comment: string) => void;
  setPaidAmount: (amount: number) => void;

  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getServiceCharge: () => number;
  getTotal: () => number;
  getChange: () => number;
  getItemsCount: () => number;

  clearOrder: () => void;
  completeOrder: () => Order | null;
}

const emptyCart = {
  currentOrder: [] as OrderItem[],
  discount: 0,
  discountPercent: 0,
  paymentMethod: 'cash' as PaymentMethod,
  orderType: 'dine-in' as OrderType,
  tableNumber: null as number | null,
  guests: 1,
  customerName: '',
  customerPhone: '',
  comment: '',
  paidAmount: 0,
};

export const useOrderStore = create<OrderStore>((set, get) => ({
  ...emptyCart,
  // ОБСЛУЖИВАНИЕ ЗАДАЁТ КАССИР, ПРИ СБРОСЕ НЕ ТЕРЯЕТСЯ
  serviceChargePercent: 10,
  // КАССИР БЕРЁТСЯ ИЗ authStore ДИНАМИЧЕСКИ

  addItem: (item) =>
    set((state) => {
      const existing = state.currentOrder.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          currentOrder: state.currentOrder.map((i) =>
            i.productId === item.productId
              ? {
                  ...i,
                  quantity: i.quantity + item.quantity,
                  total: (i.quantity + item.quantity) * i.price,
                }
              : i,
          ),
        };
      }
      return { currentOrder: [...state.currentOrder, item] };
    }),

  removeItem: (productId) =>
    set((state) => ({
      currentOrder: state.currentOrder.filter((i) => i.productId !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => ({
      currentOrder: state.currentOrder.map((i) =>
        i.productId === productId ? { ...i, quantity, total: quantity * i.price } : i,
      ),
    })),

  setDiscount: (discount) => set({ discount: Math.max(0, discount || 0) }),
  setDiscountPercent: (percent) =>
    set({ discountPercent: Math.min(100, Math.max(0, percent || 0)) }),
  setServiceChargePercent: (percent) =>
    set({ serviceChargePercent: Math.min(100, Math.max(0, percent || 0)) }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setOrderType: (type) =>
    set({ orderType: type, tableNumber: type === 'dine-in' ? get().tableNumber : null }),
  setTableNumber: (table) => set({ tableNumber: table }),
  setGuests: (guests) => set({ guests: Math.max(1, guests || 1) }),
  setCustomerName: (name) => set({ customerName: name }),
  setCustomerPhone: (phone) => set({ customerPhone: phone }),
  setComment: (comment) => set({ comment }),
  setPaidAmount: (amount) => set({ paidAmount: Math.max(0, amount || 0) }),

  getSubtotal: () => get().currentOrder.reduce((sum, item) => sum + item.total, 0),

  // СКИДКА = ФИКСИРОВАННАЯ СУММА + ПРОЦЕНТ, НЕ БОЛЬШЕ ПОДЫТОГА
  getDiscountAmount: () => {
    const { discount, discountPercent } = get();
    const subtotal = get().getSubtotal();
    return Math.min(subtotal, Math.round(discount + (subtotal * discountPercent) / 100));
  },

  // ОБСЛУЖИВАНИЕ ТОЛЬКО ДЛЯ ЗАЛА
  getServiceCharge: () => {
    const { orderType, serviceChargePercent } = get();
    if (orderType !== 'dine-in') return 0;
    const base = get().getSubtotal() - get().getDiscountAmount();
    return Math.round((base * serviceChargePercent) / 100);
  },

  getTotal: () => get().getSubtotal() - get().getDiscountAmount() + get().getServiceCharge(),

  getChange: () => Math.max(0, get().paidAmount - get().getTotal()),

  getItemsCount: () => get().currentOrder.reduce((sum, item) => sum + item.quantity, 0),

  clearOrder: () => set({ ...emptyCart }),

  completeOrder: () => {
    const state = get();
    if (state.currentOrder.length === 0) return null;

    // ПОЛУЧАЕМ ТЕКУЩЕГО КАССИРА ИЗ AUTH STORE
    const currentUser = useAuthStore.getState().currentUser;
    const cashierName = currentUser?.name || 'Неизвестно';

    const subtotal = state.getSubtotal();
    const discount = state.getDiscountAmount();
    const serviceCharge = state.getServiceCharge();
    const total = subtotal - discount + serviceCharge;

    // НАЛИЧНЫМИ МОЖНО ВНЕСТИ БОЛЬШЕ — БУДЕТ СДАЧА, БЕЗНАЛ ВСЕГДА РОВНО
    const paidAmount =
      state.paymentMethod === 'cash' && state.paidAmount > total ? state.paidAmount : total;

    const ordersStore = useOrdersStore.getState();
    const number = ordersStore.nextNumber();
    const now = new Date();

    const order: Order = {
      id: `ORD-${now.getTime()}`,
      number,
      receiptNumber: String(number).slice(-6),
      date: now.toISOString(),
      items: state.currentOrder,
      subtotal,
      discountPercent: state.discountPercent,
      discount,
      serviceChargePercent: state.orderType === 'dine-in' ? state.serviceChargePercent : 0,
      serviceCharge,
      total,
      paidAmount,
      changeAmount: paidAmount - total,
      paymentMethod: state.paymentMethod,
      status: 'completed',
      orderType: state.orderType,
      tableNumber: state.orderType === 'dine-in' ? state.tableNumber : null,
      guests: state.orderType === 'dine-in' ? state.guests : 1,
      customerName: state.customerName.trim() || 'Гость',
      customerPhone: state.customerPhone.trim() || undefined,
      cashier: cashierName,
      comment: state.comment.trim() || undefined,
      printCount: 0,
    };

    ordersStore.addOrder(order);

    // СПИСЫВАЕМ ПРОДАННОЕ СО СКЛАДА
    const decrease = useStockStore.getState().decrease;
    order.items.forEach((item) => decrease(item.productId, item.quantity));

    // ОБНОВЛЯЕМ ДАННЫЕ СМЕНЫ
    const currentShift = useShiftStore.getState().currentShift;
    if (currentShift) {
      const isCash = state.paymentMethod === 'cash';
      useShiftStore.getState().updateShiftTotals(
        currentShift.cashSales + (isCash ? total : 0),
        currentShift.cashlessSales + (isCash ? 0 : total),
        currentShift.ordersCount + 1
      );
    }

    set({ ...emptyCart });
    return order;
  },
}));
