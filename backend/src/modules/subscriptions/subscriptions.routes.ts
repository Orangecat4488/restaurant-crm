import { Router } from 'express';
import { SubscriptionsController } from './subscriptions.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

// Plans (Public read, admin write)
router.get('/plans', SubscriptionsController.getPlans);
router.get('/plans/all', authenticateJwt, requireAdmin, SubscriptionsController.getAllPlans);
router.post('/plans', authenticateJwt, requireAdmin, SubscriptionsController.createPlan);
router.put('/plans/:id', authenticateJwt, requireAdmin, SubscriptionsController.updatePlan);

// Subscriptions
router.get('/', authenticateJwt, SubscriptionsController.getMy);
router.post('/', authenticateJwt, SubscriptionsController.create);
router.get('/:id', SubscriptionsController.getById);
router.post('/:id/renew', SubscriptionsController.renew); // Open for terminal/CLI renewal
router.delete('/:id', authenticateJwt, SubscriptionsController.cancel);
router.put('/:id/auto-renew', authenticateJwt, SubscriptionsController.toggleAutoRenew);
router.get('/:id/history', authenticateJwt, SubscriptionsController.getHistory);

export default router;
