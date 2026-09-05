import { Router } from 'express';
import { getCategories, getCategory, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// All authenticated users can read categories
router.get('/', getCategories);
router.get('/:id', getCategory);

// Admin and manager can create/update/delete categories
router.post('/', requireRole('admin', 'manager'), createCategory);
router.patch('/:id', requireRole('admin', 'manager'), updateCategory);
router.delete('/:id', requireRole('admin'), deleteCategory);

export default router;