import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

// Webhook from Stripe (can be unauthenticated, validated by stripe-signature)
router.post('/webhook', PaymentsController.webhook);

// Protected routes
router.post('/create-intent', authenticateJwt, PaymentsController.createIntent);
router.get('/', authenticateJwt, PaymentsController.list);
router.get('/:id', authenticateJwt, PaymentsController.getById);
router.post('/:id/refund', authenticateJwt, requireAdmin, PaymentsController.refund);

export default router;
