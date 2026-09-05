import { Router } from 'express';
import { LicensesController } from './licenses.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

// Validation and Activation (callable by CLI or POS terminal)
router.get('/:key/validate', LicensesController.validate);
router.post('/validate', LicensesController.validate);
router.post('/:key/activate', LicensesController.activate);
router.post('/activate', LicensesController.activate);
router.post('/:key/deactivate', LicensesController.deactivate);

// License info by ID or Key
router.get('/:id', LicensesController.getById);

// Protected Admin & Client Routes
router.post('/generate', authenticateJwt, requireAdmin, LicensesController.generate);
router.get('/', authenticateJwt, requireAdmin, LicensesController.list);
router.put('/:id', authenticateJwt, requireAdmin, LicensesController.update);
router.delete('/:id', authenticateJwt, requireAdmin, LicensesController.revoke);

export default router;
