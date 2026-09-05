import { Router } from 'express';
import { login, refreshToken, logout, getMe, changePassword, verifyToken } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/security.js';
import { loginSchema, changePasswordSchema, refreshTokenSchema } from '../utils/validation.js';
import { validateRequest } from '../middleware/security.js';

const router = Router();

// Public routes with rate limiting
router.post('/login', authRateLimiter, validateRequest(loginSchema), login);
router.post('/refresh', authRateLimiter, validateRequest(refreshTokenSchema), refreshToken);
router.post('/verify-token', verifyToken);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);
router.post('/change-password', authenticateToken, validateRequest(changePasswordSchema), changePassword);

export default router;