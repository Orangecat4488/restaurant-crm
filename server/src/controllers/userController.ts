import { AuthenticatedRequest } from '../middleware/auth.js';
import { Response } from 'express';
import { getAllUsers, getUserPublicById, updateUser, deleteUser, changeUserRole, toggleUserActive, createUser, getUserByEmail } from '../models/user.js';
import { ApiResponse, PaginatedResponse, UserPublic, UserRole } from '../types/index.js';
import { paginationSchema, updateUserSchema, userIdParamSchema, createUserSchema } from '../utils/validation.js';

export async function getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = paginationSchema.safeParse(req);
    if (!parseResult.success) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid query parameters',
        message: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
      res.status(400).json(response);
      return;
    }

    const { page, limit, search, role, active } = parseResult.data.query;
    const result = await getAllUsers(page, limit, search, role, active);

    const response: ApiResponse<PaginatedResponse<UserPublic>> = {
      success: true,
      data: {
        items: result.users,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Get users error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function getUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = userIdParamSchema.safeParse(req);
    if (!parseResult.success) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid user ID',
        message: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
      res.status(400).json(response);
      return;
    }

    const { id } = parseResult.data.params;
    const user = await getUserPublicById(id);

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<UserPublic> = {
      success: true,
      data: user,
    };
    res.json(response);
  } catch (error) {
    console.error('Get user error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function createUserHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = createUserSchema.safeParse(req);
    if (!parseResult.success) {
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed',
        message: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
      res.status(400).json(response);
      return;
    }

    const { name, email, password, role = 'employee' } = parseResult.data.body;

    // Check if email already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      const response: ApiResponse = {
        success: false,
        error: 'Email already registered',
      };
      res.status(409).json(response);
      return;
    }

    // Only admins can create admin users
    if (role === 'admin' && req.user?.role !== 'admin') {
      const response: ApiResponse = {
        success: false,
        error: 'Only admins can create admin users',
      };
      res.status(403).json(response);
      return;
    }

    const user = await createUser(name, email, password, role as UserRole);

    const response: ApiResponse<UserPublic> = {
      success: true,
      data: user,
      message: 'User created successfully',
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Create user error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function updateUserHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = updateUserSchema.safeParse(req);
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
    const { name, email, role, active } = parseResult.data.body;

    // Check if user exists
    const existingUser = await getUserPublicById(id);
    if (!existingUser) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      res.status(404).json(response);
      return;
    }

    // Prevent non-admins from promoting to admin
    if (role === 'admin' && req.user?.role !== 'admin') {
      const response: ApiResponse = {
        success: false,
        error: 'Only admins can assign admin role',
      };
      res.status(403).json(response);
      return;
    }

    // Prevent users from deactivating themselves
    if (id === req.user?.userId && active === false) {
      const response: ApiResponse = {
        success: false,
        error: 'Cannot deactivate your own account',
      };
      res.status(400).json(response);
      return;
    }

    // Prevent users from changing their own role
    if (id === req.user?.userId && role && role !== existingUser.role) {
      const response: ApiResponse = {
        success: false,
        error: 'Cannot change your own role',
      };
      res.status(400).json(response);
      return;
    }

    const user = await updateUser(id, { name, email, role: role as UserRole, active });

    const response: ApiResponse<UserPublic> = {
      success: true,
      data: user!,
      message: 'User updated successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Update user error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function deleteUserHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = userIdParamSchema.safeParse(req);
    if (!parseResult.success) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid user ID',
        message: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
      res.status(400).json(response);
      return;
    }

    const { id } = parseResult.data.params;

    // Prevent users from deleting themselves
    if (id === req.user?.userId) {
      const response: ApiResponse = {
        success: false,
        error: 'Cannot delete your own account',
      };
      res.status(400).json(response);
      return;
    }

    // Check if user exists
    const existingUser = await getUserPublicById(id);
    if (!existingUser) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      res.status(404).json(response);
      return;
    }

    // Only admins can delete admin users
    if (existingUser.role === 'admin' && req.user?.role !== 'admin') {
      const response: ApiResponse = {
        success: false,
        error: 'Only admins can delete admin users',
      };
      res.status(403).json(response);
      return;
    }

    const deleted = await deleteUser(id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to delete user',
      };
      res.status(500).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'User deleted successfully',
    };
    res.json(response);
  } catch (error) {
    console.error('Delete user error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}

export async function toggleUserActiveHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const parseResult = userIdParamSchema.safeParse(req);
    if (!parseResult.success) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid user ID',
        message: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
      res.status(400).json(response);
      return;
    }

    const { id } = parseResult.data.params;

    // Prevent users from deactivating themselves
    if (id === req.user?.userId) {
      const response: ApiResponse = {
        success: false,
        error: 'Cannot change your own active status',
      };
      res.status(400).json(response);
      return;
    }

    const user = await toggleUserActive(id);
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<UserPublic> = {
      success: true,
      data: user,
      message: `User ${user.active ? 'activated' : 'deactivated'} successfully`,
    };
    res.json(response);
  } catch (error) {
    console.error('Toggle user active error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
    };
    res.status(500).json(response);
  }
}