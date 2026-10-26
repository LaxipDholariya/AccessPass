import { Router } from 'express';
import {
  getHostRequests,
  approveRequest,
  rejectRequest,
  revokeRequest,
} from '../controllers/hostController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all host routes: Require valid token and 'host' or 'admin' role
router.use(authenticateToken);
router.use(requireRole(['host', 'admin']));

// List incoming requests for host
router.get('/requests', getHostRequests);

// Approve a visit request (generates digital pass)
router.patch('/requests/:id/approve', approveRequest);

// Reject a visit request
router.patch('/requests/:id/reject', rejectRequest);

// Revoke an issued digital pass
router.patch('/requests/:id/revoke', revokeRequest);

export default router;
