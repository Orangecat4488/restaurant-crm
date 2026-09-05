import { Router } from 'express';
import { getUsers, getUser, createUserHandler, updateUserHandler, deleteUserHandler, toggleUserActiveHandler } from '../controllers/userController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Admin and manager can list users
router.get('/', requireRole('admin', 'manager'), getUsers);

// Admin and manager can view specific user
router.get('/:id', requireRole('admin', 'manager'), getUser);

// Only admin can create users
router.post('/', requireRole('admin'), createUserHandler);

// Admin and manager can update users (with restrictions in controller)
router.patch('/:id', requireRole('admin', 'manager'), updateUserHandler);

// Only admin can delete users
router.delete('/:id', requireRole('admin'), deleteUserHandler);

// Admin and manager can toggle active status
router.post('/:id/toggle-active', requireRole('admin', 'manager'), toggleUserActiveHandler);

export default router;