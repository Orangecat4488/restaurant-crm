export type PaymentMethod = 'cash' | 'card' | 'click' | 'payme' | 'uzumbank';
export type OrderStatus = 'completed' | 'pending' | 'cancelled' | 'refunded';
export type OrderType = 'dine-in' | 'takeaway' | 'delivery';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Order {
  id: string;
  // СКВОЗНОЙ НОМЕР ЗАКАЗА И НОМЕР ЧЕКА
  number: number;
  receiptNumber: string;
  // ISO-СТРОКА, ЧТОБЫ ЗАКАЗЫ ЖИЛИ В localStorage
  date: string;

  items: OrderItem[];

  // ДЕНЬГИ
  subtotal: number;
  discountPercent: number;
  discount: number;
  serviceChargePercent: number;
  serviceCharge: number;
  total: number;
  paidAmount: number;
  changeAmount: number;

  paymentMethod: PaymentMethod;
  status: OrderStatus;
  orderType: OrderType;

  // ЗАЛ
  tableNumber?: number | null;
  guests?: number;

  // КЛИЕНТ И КАССА
  customerName?: string;
  customerPhone?: string;
  cashier: string;
  comment?: string;

  // СКОЛЬКО РАЗ ПЕЧАТАЛИ ЧЕК (0 — ОРИГИНАЛ)
  printCount: number;
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Наличные',
  card: 'Карта',
  click: 'Click',
  payme: 'Payme',
  uzumbank: 'Uzum Bank',
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  completed: 'Оплачен',
  pending: 'Открыт',
  cancelled: 'Отменён',
  refunded: 'Возврат',
};

export const STATUS_BADGE: Record<OrderStatus, string> = {
  completed: 'badge-success',
  pending: 'badge-warning',
  cancelled: 'badge-danger',
  refunded: 'badge-info',
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  'dine-in': 'В зале',
  takeaway: 'С собой',
  delivery: 'Доставка',
};

// НАЛИЧНЫЕ ИЛИ БЕЗНАЛИЧНЫЕ
export const isCash = (method: PaymentMethod) => method === 'cash';
