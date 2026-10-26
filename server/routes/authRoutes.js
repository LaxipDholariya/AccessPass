import { Router } from 'express';
import { login, getMe } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Public login route
router.post('/login', login);

// Protected token verification / current user profile
router.get('/me', authenticateToken, getMe);

export default router;
