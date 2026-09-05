import { getDb } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

export async function initializeDatabase(): Promise<void> {
  const db = await getDb();

  // Create users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT
    );
  `);

  // Create refresh_tokens table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      revoked INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create categories table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create products table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL CHECK (price >= 0),
      category_id TEXT,
      image_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // Create orders table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      number INTEGER NOT NULL UNIQUE,
      customer_name TEXT,
      customer_phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
      payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'online')),
      total REAL NOT NULL CHECK (total >= 0),
      items TEXT NOT NULL DEFAULT '[]',
      user_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Create order counter table for sequential order numbers
  await db.exec(`
    CREATE TABLE IF NOT EXISTS counters (
      name TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Initialize order counter if not exists
  await db.run(`
    INSERT OR IGNORE INTO counters (name, value) VALUES ('order_number', 0);
  `);

  // Create indexes
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  `);

  // Seed default users if none exist
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount && userCount.count === 0) {
    const adminHash = await bcrypt.hash('admin123', BCRYPT_ROUNDS);
    const managerHash = await bcrypt.hash('manager123', BCRYPT_ROUNDS);
    const employeeHash = await bcrypt.hash('employee123', BCRYPT_ROUNDS);
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO users (id, name, email, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), 'Администратор', 'admin@restaurant.com', adminHash, 'admin', 1, now, now]
    );

    await db.run(
      `INSERT INTO users (id, name, email, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), 'Менеджер зала', 'manager@restaurant.com', managerHash, 'manager', 1, now, now]
    );

    await db.run(
      `INSERT INTO users (id, name, email, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), 'Сотрудник / Официант', 'employee@restaurant.com', employeeHash, 'employee', 1, now, now]
    );

    console.log('Default users created:');
    console.log('  Admin:    admin@restaurant.com    / admin123');
    console.log('  Manager:  manager@restaurant.com  / manager123');
    console.log('  Employee: employee@restaurant.com / employee123');
  }

  // Seed default categories and products if none exist
  const categoryCount = await db.get('SELECT COUNT(*) as count FROM categories');
  if (categoryCount && categoryCount.count === 0) {
    const now = new Date().toISOString();
    const saladsId = uuidv4();
    const soupsId = uuidv4();
    const mainsId = uuidv4();
    const drinksId = uuidv4();
    const dessertsId = uuidv4();

    const categories = [
      { id: saladsId, name: 'Салаты', description: 'Свежие салаты', color: '#10B981' },
      { id: soupsId, name: 'Супы', description: 'Горячие супы', color: '#F59E0B' },
      { id: mainsId, name: 'Основные блюда', description: 'Горячие основные блюда', color: '#EF4444' },
      { id: drinksId, name: 'Напитки', description: 'Холодные и горячие напитки', color: '#3B82F6' },
      { id: dessertsId, name: 'Десерты', description: 'Сладкие десерты', color: '#EC4899' },
    ];

    for (const cat of categories) {
      await db.run(
        `INSERT INTO categories (id, name, description, color, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [cat.id, cat.name, cat.description, cat.color, 1, now, now]
      );
    }

    const products = [
      { id: uuidv4(), name: 'Цезарь с курицей', description: 'Классический салат с соусом цезарь', price: 420, category_id: saladsId },
      { id: uuidv4(), name: 'Греческий салат', description: 'Свежие овощи с сыром фета', price: 380, category_id: saladsId },
      { id: uuidv4(), name: 'Борщ сибирский', description: 'Традиционный борщ со сметаной и пампушками', price: 350, category_id: soupsId },
      { id: uuidv4(), name: 'Том Ям с морепродуктами', description: 'Острый тайский суп', price: 590, category_id: soupsId },
      { id: uuidv4(), name: 'Стейк Рибай', description: 'Сочный стейк с перечным соусом', price: 1450, category_id: mainsId },
      { id: uuidv4(), name: 'Паста Карбонара', description: 'Спагетти с беконом и пармезаном', price: 480, category_id: mainsId },
      { id: uuidv4(), name: 'Капучино', description: 'Кофе с нежной молочной пенкой', price: 220, category_id: drinksId },
      { id: uuidv4(), name: 'Лимонад клубничный', description: 'Освежающий авторский напиток', price: 280, category_id: drinksId },
      { id: uuidv4(), name: 'Чизкейк Нью-Йорк', description: 'Классический сливочный чизкейк', price: 320, category_id: dessertsId },
    ];

    for (const p of products) {
      await db.run(
        `INSERT INTO products (id, name, description, price, category_id, image_url, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [p.id, p.name, p.description, p.price, p.category_id, null, now, now]
      );
    }
  }

  console.log('Database initialized successfully');
}

export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.exec(`
    DROP TABLE IF EXISTS refresh_tokens;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS counters;
  `);
  await initializeDatabase();
}