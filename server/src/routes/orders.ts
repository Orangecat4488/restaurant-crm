import { Router } from 'express';
import { getOrders, getOrder, createOrder, updateOrder, deleteOrder } from '../controllers/orderController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// All authenticated users (admin, manager, employee) can list and view orders
router.get('/', getOrders);
router.get('/:id', getOrder);

// Admin, manager, employee can create orders
router.post('/', requireRole('admin', 'manager', 'employee'), createOrder);

// Admin and manager can update orders
router.patch('/:id', requireRole('admin', 'manager'), updateOrder);

// Only admin can delete orders
router.delete('/:id', requireRole('admin'), deleteOrder);

export default router;
