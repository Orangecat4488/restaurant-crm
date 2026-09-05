import { AuthenticatedRequest } from '../middleware/auth.js';
import { Response } from 'express';
import { getDb } from '../config/database.js';
import { ApiResponse, PaginatedResponse } from '../types/index.js';
import { paginationSchema, orderSchema, orderUpdateSchema } from '../utils/validation.js';
import { v4 as uuidv4 } from 'uuid';

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface Order {
  id: string;
  number: number;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  payment_method: string;
  total: number;
  items: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function mapRowToOrder(row: any): Order {
  return {
    id: row.id,
    number: row.number,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    status: row.status,
    payment_method: row.payment_method,
    total: row.total,
    items: row.items,
    user_id: row.user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
  };
}

export async function getOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = paginationSchema.safeParse(req);
    if (!parseResult.success) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid query parameters',
      };
      res.status(400).json(response);
      return;
    }

    const { page, limit, search, active } = parseResult.data.query;
    const db = await getDb();
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (customer_name LIKE ? OR customer_phone LIKE ? OR CAST(number AS TEXT) LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (active !== undefined) {
      whereClause += ' AND active = ?';
      params.push(active ? 1 : 0);
    }

    const countResult = await db.get(
      `SELECT COUNT(*) as total FROM orders ${whereClause}`,
      params
    );

    const rows = await db.all(
      `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const response: ApiResponse<PaginatedResponse<Order>> = {
      success: true,
      data: {
        items: rows.map(mapRowToOrder),
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit),
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Get orders error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function getOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const db = await getDb();
    const row = await db.get('SELECT * FROM orders WHERE id = ?', [id]);

    if (!row) {
      const response: ApiResponse = {
        success: false,
        error: 'Order not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Order> = {
      success: true,
      data: mapRowToOrder(row),
    };
    res.json(response);
  } catch (error) {
    console.error('Get order error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

async function getNextOrderNumber(db: any): Promise<number> {
  const result = await db.get('SELECT value FROM counters WHERE name = ?', ['order_number']);
  const nextNumber = (result?.value || 0) + 1;
  await db.run('UPDATE counters SET value = ? WHERE name = ?', [nextNumber, 'order_number']);
  return nextNumber;
}

export async function createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = orderSchema.safeParse(req);
    if (!parseResult.success) {
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed',
        message: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
      res.status(400).json(response);
      return;
    }

    const { customerName, customerPhone, items, paymentMethod } = parseResult.data.body;
    const db = await getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    // Calculate total and validate products
    let total = 0;
    const validatedItems: OrderItem[] = [];

    for (const item of items) {
      const product = await db.get('SELECT * FROM products WHERE id = ? AND active = 1', [item.productId]);
      if (!product) {
        const response: ApiResponse = {
          success: false,
          error: `Product not found or inactive: ${item.productId}`,
        };
        res.status(400).json(response);
        return;
      }
      total += item.price * item.quantity;
      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
      });
    }

    const orderNumber = await getNextOrderNumber(db);

    await db.run(
      `INSERT INTO orders (id, number, customer_name, customer_phone, status, payment_method, total, items, user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, orderNumber, customerName || null, customerPhone || null, 'pending', paymentMethod, total, JSON.stringify(validatedItems), req.user!.userId, now, now]
    );

    const row = await db.get('SELECT * FROM orders WHERE id = ?', [id]);

    const response: ApiResponse<Order> = {
      success: true,
      data: mapRowToOrder(row),
      message: 'Order created successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Create order error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function updateOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = orderUpdateSchema.safeParse(req);
    if (!parseResult.success) {
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed',
        message: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
      res.status(400).json(response);
      return;
    }

    const { id } = parseResult.data.params;
    const { status, paymentMethod, customerName, customerPhone } = parseResult.data.body;
    const db = await getDb();

    const existing = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: 'Order not found',
      };
      res.status(404).json(response);
      return;
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'completed') {
        updates.push('completed_at = ?');
        params.push(new Date().toISOString());
      }
    }
    if (paymentMethod !== undefined) { updates.push('payment_method = ?'); params.push(paymentMethod); }
    if (customerName !== undefined) { updates.push('customer_name = ?'); params.push(customerName); }
    if (customerPhone !== undefined) { updates.push('customer_phone = ?'); params.push(customerPhone); }

    if (updates.length === 0) {
      const response: ApiResponse<Order> = {
        success: true,
        data: mapRowToOrder(existing),
      };
      res.json(response);
      return;
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await db.run(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params);

    const row = await db.get('SELECT * FROM orders WHERE id = ?', [id]);

    const response: ApiResponse<Order> = {
      success: true,
      data: mapRowToOrder(row),
      message: 'Order updated successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Update order error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function deleteOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const db = await getDb();

    const existing = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: 'Order not found',
      };
      res.status(404).json(response);
      return;
    }

    // Only allow deletion of pending/cancelled orders
    if (!['pending', 'cancelled'].includes(existing.status)) {
      const response: ApiResponse = {
        success: false,
        error: 'Can only delete pending or cancelled orders',
      };
      res.status(400).json(response);
      return;
    }

    await db.run('DELETE FROM orders WHERE id = ?', [id]);

    const response: ApiResponse = {
      success: true,
      message: 'Order deleted successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Delete order error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}