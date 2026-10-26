import { Router } from 'express';
import {
  getStats,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  approveStaffUser,
  rejectStaffUser,
  getBuildings,
  createBuilding,
  updateBuilding,
  getBlacklist,
  addBlacklist,
  removeBlacklist,
  getAuditLogs,
  exportVisitsCSV,
} from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all admin routes: Require valid token and 'admin' role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Dashboard metrics
router.get('/stats', getStats);

// User management
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id/approve', approveStaffUser);
router.patch('/users/:id/reject', rejectStaffUser);
router.delete('/users/:id', deleteUser);

// Building management
router.get('/buildings', getBuildings);
router.post('/buildings', createBuilding);
router.put('/buildings/:id', updateBuilding);

// Blacklist management
router.get('/blacklist', getBlacklist);
router.post('/blacklist', addBlacklist);
router.delete('/blacklist/:id', removeBlacklist);

// Audit logs
router.get('/audit-logs', getAuditLogs);

// Report export
router.get('/reports/visits-csv', exportVisitsCSV);

export default router;
