import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../data/products';

export interface Category {
  id: string;
  name: string;
  image: string;
}

interface ProductsStore {
  products: Product[];
  categories: Category[];

  // ТОВАРЫ
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleProductActive: (id: string) => void;

  // КАТЕГОРИИ
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // ПОИСК
  getProduct: (id: string) => Product | undefined;
  getCategory: (id: string) => Category | undefined;
}

// ИМПОРТИРУЕМ НАЧАЛЬНЫЕ ДАННЫЕ
import { products as initialProducts, categories as initialCategories } from '../data/products';

export const useProductsStore = create<ProductsStore>()(
  persist(
    (set, get) => ({
      products: initialProducts,
      categories: initialCategories,

      // ТОВАРЫ
      addProduct: (productData) => {
        const id = `product-${Date.now()}`;
        set((state) => ({
          products: [...state.products, { ...productData, id }],
        }));
      },

      updateProduct: (id, data) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
      },

      toggleProductActive: (id) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, isActive: !p.isActive } : p
          ),
        }));
      },

      // КАТЕГОРИИ
      addCategory: (categoryData) => {
        const id = `category-${Date.now()}`;
        set((state) => ({
          categories: [...state.categories, { ...categoryData, id }],
        }));
      },

      updateCategory: (id, data) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        }));
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          // Удаляем товары этой категории или помечаем как без категории
          products: state.products.filter((p) => p.category !== id),
        }));
      },

      // ПОИСК
      getProduct: (id) => get().products.find((p) => p.id === id),
      getCategory: (id) => get().categories.find((c) => c.id === id),
    }),
    { name: 'restaurant-crm-products' },
  ),
);
