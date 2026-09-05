// src/utils/format.ts
// ФОРМАТ ДЕНЕГ И ДАТ ДЛЯ ВСЕГО ПРИЛОЖЕНИЯ

// РАЗРЯДЫ ЧЕРЕЗ ОБЫЧНЫЙ ПРОБЕЛ: 1 234 567
export const formatMoney = (value: number) =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const formatSum = (value: number) => `${formatMoney(value)} сум`;

// КОРОТКО ДЛЯ ПЛИТОК: 12.5М / 295K
export const formatShort = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}М сум`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}K сум`;
  return `${formatMoney(value)} сум`;
};

const pad = (n: number) => String(n).padStart(2, '0');

export const formatDate = (date: string | Date) => {
  const d = new Date(date);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

export const formatTime = (date: string | Date) => {
  const d = new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatDateTime = (date: string | Date) =>
  `${formatDate(date)} ${formatTime(date)}`;

// ИЗМЕНЕНИЕ В ПРОЦЕНТАХ ДЛЯ ПЛИТОК ДАШБОРДА
export const formatChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const diff = ((current - previous) / previous) * 100;
  return `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%`;
};

// ПРИВЕТСТВИЕ ПО ВРЕМЕНИ СУТОК
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Доброе утро';
  if (hour >= 12 && hour < 17) return 'Добрый день';
  if (hour >= 17 && hour < 22) return 'Добрый вечер';
  return 'Доброй ночи';
};
