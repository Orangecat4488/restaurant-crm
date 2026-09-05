import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', requireAdmin, UsersController.list);
router.get('/:id', UsersController.getById);
router.put('/:id', requireAdmin, UsersController.update);
router.delete('/:id', requireAdmin, UsersController.delete);

export default router;
