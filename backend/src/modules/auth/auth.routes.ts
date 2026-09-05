import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateJwt } from '../../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

// Dev-only: re-seed demo credentials. Useful when locked out.
router.post('/dev-reset-demo', AuthController.devResetDemoCredentials);

// Protected routes
router.get('/me', authenticateJwt, AuthController.me);
router.put('/profile', authenticateJwt, AuthController.updateProfile);
router.put('/change-password', authenticateJwt, AuthController.changePassword);

export default router;
