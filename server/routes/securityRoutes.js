import { Router } from 'express';
import {
  verifyPass,
  checkIn,
  checkOut,
  getTodayLogs,
} from '../controllers/securityController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all security routes: Require valid token and 'security' or 'admin' role
router.use(authenticateToken);
router.use(requireRole(['security', 'admin']));

// Verify pass via QR token or reference code
router.post('/verify-pass', verifyPass);

// Record gate entry
router.post('/check-in', checkIn);

// Record gate exit
router.post('/check-out', checkOut);

// View today's checkpoint logs
router.get('/today-logs', getTodayLogs);

export default router;
