import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { products } from '../data/products';

// НАЧАЛЬНЫЕ ОСТАТКИ ИЗ src/data/products.ts
const initialStock = (): Record<string, number> =>
  products.reduce<Record<string, number>>((acc, p) => {
    acc[p.id] = p.stock;
    return acc;
  }, {});

interface StockStore {
  stock: Record<string, number>;

  getStock: (productId: string) => number;
  increase: (productId: string, step?: number) => void;
  decrease: (productId: string, step?: number) => void;
  setStock: (productId: string, quantity: number) => void;
  resetStock: () => void;

  // ИТОГИ
  getTotalStock: () => number;
  getCategoryStock: (categoryId: string) => number;
}

export const useStockStore = create<StockStore>()(
  persist(
    (set, get) => ({
  stock: initialStock(),

  getStock: (productId) => get().stock[productId] ?? 0,

  increase: (productId, step = 1) =>
    set((state) => ({
      stock: { ...state.stock, [productId]: (state.stock[productId] ?? 0) + step },
    })),

  decrease: (productId, step = 1) =>
    set((state) => ({
      // НЕ НИЖЕ НУЛЯ
      stock: { ...state.stock, [productId]: Math.max(0, (state.stock[productId] ?? 0) - step) },
    })),

  setStock: (productId, quantity) =>
    set((state) => ({
      stock: { ...state.stock, [productId]: Math.max(0, Math.floor(quantity) || 0) },
    })),

  resetStock: () => set({ stock: initialStock() }),

  getTotalStock: () => Object.values(get().stock).reduce((sum, n) => sum + n, 0),

  getCategoryStock: (categoryId) => {
    const stock = get().stock;
    return products
      .filter((p) => p.category === categoryId)
      .reduce((sum, p) => sum + (stock[p.id] ?? 0), 0);
  },
}),
    { name: 'restaurant-crm-stock' },
  ),
);
