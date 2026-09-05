import { AuthenticatedRequest } from '../middleware/auth.js';
import { Response } from 'express';
import { getDb } from '../config/database.js';
import { ApiResponse, PaginatedResponse } from '../types/index.js';
import { paginationSchema, productSchema, productUpdateSchema } from '../utils/validation.js';
import { v4 as uuidv4 } from 'uuid';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

function mapRowToProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    category_id: row.category_id,
    image_url: row.image_url,
    active: Boolean(row.active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      whereClause += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (active !== undefined) {
      whereClause += ' AND active = ?';
      params.push(active ? 1 : 0);
    }

    const countResult = await db.get(
      `SELECT COUNT(*) as total FROM products ${whereClause}`,
      params
    );

    const rows = await db.all(
      `SELECT * FROM products ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const response: ApiResponse<PaginatedResponse<Product>> = {
      success: true,
      data: {
        items: rows.map(mapRowToProduct),
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit),
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Get products error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function getProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const db = await getDb();
    const row = await db.get('SELECT * FROM products WHERE id = ?', [id]);

    if (!row) {
      const response: ApiResponse = {
        success: false,
        error: 'Product not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Product> = {
      success: true,
      data: mapRowToProduct(row),
    };
    res.json(response);
  } catch (error) {
    console.error('Get product error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = productSchema.safeParse(req);
    if (!parseResult.success) {
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed',
        message: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
      res.status(400).json(response);
      return;
    }

    const { name, description, price, categoryId, imageUrl, active = true } = parseResult.data.body;
    const db = await getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO products (id, name, description, price, category_id, image_url, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description || null, price, categoryId || null, imageUrl || null, active ? 1 : 0, now, now]
    );

    const row = await db.get('SELECT * FROM products WHERE id = ?', [id]);

    const response: ApiResponse<Product> = {
      success: true,
      data: mapRowToProduct(row),
      message: 'Product created successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Create product error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = productUpdateSchema.safeParse(req);
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
    const { name, description, price, categoryId, imageUrl, active } = parseResult.data.body;
    const db = await getDb();

    const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: 'Product not found',
      };
      res.status(404).json(response);
      return;
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (price !== undefined) { updates.push('price = ?'); params.push(price); }
    if (categoryId !== undefined) { updates.push('category_id = ?'); params.push(categoryId); }
    if (imageUrl !== undefined) { updates.push('image_url = ?'); params.push(imageUrl); }
    if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }

    if (updates.length === 0) {
      const response: ApiResponse<Product> = {
        success: true,
        data: mapRowToProduct(existing),
      };
      res.json(response);
      return;
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await db.run(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);

    const row = await db.get('SELECT * FROM products WHERE id = ?', [id]);

    const response: ApiResponse<Product> = {
      success: true,
      data: mapRowToProduct(row),
      message: 'Product updated successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Update product error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const db = await getDb();

    const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: 'Product not found',
      };
      res.status(404).json(response);
      return;
    }

    await db.run('DELETE FROM products WHERE id = ?', [id]);

    const response: ApiResponse = {
      success: true,
      message: 'Product deleted successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Delete product error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}