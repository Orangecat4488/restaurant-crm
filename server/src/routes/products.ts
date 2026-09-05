import { Router } from 'express';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../controllers/productController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// All authenticated users can read products
router.get('/', getProducts);
router.get('/:id', getProduct);

// Admin and manager can create/update/delete products
router.post('/', requireRole('admin', 'manager'), createProduct);
router.patch('/:id', requireRole('admin', 'manager'), updateProduct);
router.delete('/:id', requireRole('admin'), deleteProduct);

export default router;