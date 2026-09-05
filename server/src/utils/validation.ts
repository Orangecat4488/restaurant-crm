import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email format'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    role: z.enum(['admin', 'manager', 'employee']).optional(),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }).optional(),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password required'),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email format'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    role: z.enum(['admin', 'manager', 'employee']).default('employee'),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    email: z.string().email('Invalid email format').optional(),
    role: z.enum(['admin', 'manager', 'employee']).optional(),
    active: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
    role: z.enum(['admin', 'manager', 'employee']).optional(),
    active: z.coerce.boolean().optional(),
  }),
});

export const productSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name required').max(200),
    description: z.string().max(1000).optional(),
    price: z.number().positive('Price must be positive'),
    categoryId: z.string().uuid('Invalid category ID').optional(),
    imageUrl: z.string().url('Invalid image URL').optional(),
    active: z.boolean().default(true),
  }),
});

export const productUpdateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name required').max(200).optional(),
    description: z.string().max(1000).optional(),
    price: z.number().positive('Price must be positive').optional(),
    categoryId: z.string().uuid('Invalid category ID').optional(),
    imageUrl: z.string().url('Invalid image URL').optional(),
    active: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid product ID'),
  }),
});

export const categorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name required').max(100),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
    active: z.boolean().default(true),
  }),
});

export const categoryUpdateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name required').max(100).optional(),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
    active: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),
});

export const orderSchema = z.object({
  body: z.object({
    customerName: z.string().max(200).optional(),
    customerPhone: z.string().max(50).optional(),
    items: z.array(z.object({
      productId: z.string().uuid('Invalid product ID'),
      quantity: z.number().int().positive('Quantity must be positive'),
      price: z.number().positive('Price must be positive'),
      notes: z.string().max(500).optional(),
    })).min(1, 'At least one item required'),
    paymentMethod: z.enum(['cash', 'card', 'online']).default('cash'),
  }),
});

export const orderUpdateSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'preparing', 'ready', 'completed', 'cancelled']).optional(),
    paymentMethod: z.enum(['cash', 'card', 'online']).optional(),
    customerName: z.string().max(200).optional(),
    customerPhone: z.string().max(50).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid order ID'),
  }),
});