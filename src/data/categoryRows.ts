// src/data/categoryRows.ts
// ОДИН ПОРЯДОК КАТЕГОРИЙ ДЛЯ Products.tsx И Categories.tsx
// 1 РЯД — МЯСНОЕ И САЛАТЫ, ПОСЛЕДНИЙ РЯД — НАПИТКИ

// ЕДА ПО РЯДАМ
export const FOOD_ROWS: string[][] = [
  // 1 РЯД — МЯСО И САЛАТЫ
  ['shashlik', 'chicken', 'meat-snacks', 'salads', 'seafood-salads', 'vegetable-salads'],
  // 2 РЯД — ОСНОВНЫЕ БЛЮДА И ЗАКУСКИ
  ['main-courses', 'cold-snacks', 'hot-snacks'],
  // 3 РЯД — СУПЫ
  ['cold-soups', 'hot-soups'],
  // 4 РЯД — ГАРНИРЫ, ХЛЕБ, ДЕСЕРТЫ
  ['garnishes', 'bread', 'desserts'],
];

// НАПИТКИ — ВСЕГДА ПОСЛЕДНИЙ РЯД
export const DRINK_ROW: string[] = ['drinks', 'beer', 'mojito', 'vodka', 'cognac', 'wine'];

// НАЗВАНИЯ РЯДОВ (ДЛЯ ЗАГОЛОВКОВ)
export const ROW_TITLES: string[] = [
  'Мясное и салаты',
  'Основные блюда и закуски',
  'Супы',
  'Гарниры, хлеб, десерты',
];

export const OTHER_ROW_TITLE = 'Другое';
export const DRINK_ROW_TITLE = 'Напитки';

// ВСЕ ИЗВЕСТНЫЕ КАТЕГОРИИ В ПРАВИЛЬНОМ ПОРЯДКЕ
export const CATEGORY_ORDER: string[] = [...FOOD_ROWS.flat(), ...DRINK_ROW];
