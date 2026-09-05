import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';
import { requireAdmin, requireAdminOrManager } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/dashboard', requireAdminOrManager, AdminController.getDashboard);
router.get('/clients', requireAdminOrManager, AdminController.getClients);
router.get('/clients/:id', requireAdminOrManager, AdminController.getClientDetail);
router.put('/clients/:id/status', requireAdmin, AdminController.toggleClientStatus);
router.post('/bulk-license', requireAdmin, AdminController.bulkGenerateLicenses);
router.get('/reports', requireAdminOrManager, AdminController.getReports);
router.get('/analytics', requireAdmin, AdminController.getAnalytics);
router.get('/audit-logs', requireAdmin, AdminController.getAuditLogs);
router.post('/clients/:id/reset-credentials', requireAdmin, AdminController.resetClientCredentials);
router.post('/clients/:id/unlock', requireAdmin, AdminController.unlockClient);

export default router;
