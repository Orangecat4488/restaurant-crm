export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  stock: number;
  isActive: boolean;
  description?: string;
}