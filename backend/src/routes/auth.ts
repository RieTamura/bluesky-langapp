import { Router } from 'express';
import AuthController from '../controllers/authController.js';

const router = Router();

/**
 * POST /api/auth/login
 * Login with Bluesky credentials
 */
router.post('/login', AuthController.login);

/**
 * POST /api/auth/logout
 * Logout and clear session
 */
router.post('/logout', AuthController.logout);

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', AuthController.me);

export default router;