import { Router } from 'express';
import {
  getBuildings,
  getHosts,
  registerVisit,
  getVisitStatus,
  getVisitByReference,
  verifyVisitAccess,
  registerStaff,
} from '../controllers/publicController.js';

const router = Router();

// Dropdown population for visitor registration
router.get('/buildings', getBuildings);
router.get('/hosts', getHosts);

// Visitor self-service registration
router.post('/visits/register', registerVisit);

// Visitor public status lookup (privacy-preserving: zero PII, zero QR tokens)
router.get('/visits/:referenceCode/status', getVisitStatus);
router.get('/visits/:referenceCode', getVisitByReference);

// Visitor verified private access (requires verification secret)
router.post('/visits/:referenceCode/verify-access', verifyVisitAccess);

// Public staff access request registration (creates pending approval account)
router.post('/staff/register', registerStaff);

export default router;
