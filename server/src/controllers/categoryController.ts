import { AuthenticatedRequest } from '../middleware/auth.js';
import { Response } from 'express';
import { getDb } from '../config/database.js';
import { ApiResponse, PaginatedResponse } from '../types/index.js';
import { paginationSchema, categorySchema, categoryUpdateSchema } from '../utils/validation.js';
import { v4 as uuidv4 } from 'uuid';

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

function mapRowToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    active: Boolean(row.active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      `SELECT COUNT(*) as total FROM categories ${whereClause}`,
      params
    );

    const rows = await db.all(
      `SELECT * FROM categories ${whereClause} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const response: ApiResponse<PaginatedResponse<Category>> = {
      success: true,
      data: {
        items: rows.map(mapRowToCategory),
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit),
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Get categories error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function getCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const db = await getDb();
    const row = await db.get('SELECT * FROM categories WHERE id = ?', [id]);

    if (!row) {
      const response: ApiResponse = {
        success: false,
        error: 'Category not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Category> = {
      success: true,
      data: mapRowToCategory(row),
    };
    res.json(response);
  } catch (error) {
    console.error('Get category error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = categorySchema.safeParse(req);
    if (!parseResult.success) {
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed',
        message: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
      res.status(400).json(response);
      return;
    }

    const { name, description, color, active = true } = parseResult.data.body;
    const db = await getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO categories (id, name, description, color, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description || null, color || null, active ? 1 : 0, now, now]
    );

    const row = await db.get('SELECT * FROM categories WHERE id = ?', [id]);

    const response: ApiResponse<Category> = {
      success: true,
      data: mapRowToCategory(row),
      message: 'Category created successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Create category error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = categoryUpdateSchema.safeParse(req);
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
    const { name, description, color, active } = parseResult.data.body;
    const db = await getDb();

    const existing = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: 'Category not found',
      };
      res.status(404).json(response);
      return;
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (color !== undefined) { updates.push('color = ?'); params.push(color); }
    if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }

    if (updates.length === 0) {
      const response: ApiResponse<Category> = {
        success: true,
        data: mapRowToCategory(existing),
      };
      res.json(response);
      return;
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await db.run(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);

    const row = await db.get('SELECT * FROM categories WHERE id = ?', [id]);

    const response: ApiResponse<Category> = {
      success: true,
      data: mapRowToCategory(row),
      message: 'Category updated successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Update category error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function deleteCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const db = await getDb();

    const existing = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: 'Category not found',
      };
      res.status(404).json(response);
      return;
    }

    // Check if category has products
    const productCount = await db.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]);
    if (productCount.count > 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Cannot delete category with associated products',
      };
      res.status(400).json(response);
      return;
    }

    await db.run('DELETE FROM categories WHERE id = ?', [id]);

    const response: ApiResponse = {
      success: true,
      message: 'Category deleted successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Delete category error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}