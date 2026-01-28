import { Router } from 'express';
import * as scimController from '../controllers/scimController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// SCIM 2.0 endpoints (require SCIM bearer token)
router.get('/scim/v2/Users', scimController.scimAuthMiddleware, scimController.listScimUsers);
router.get('/scim/v2/Users/:id', scimController.scimAuthMiddleware, scimController.getScimUserByIdRoute);
router.post('/scim/v2/Users', scimController.scimAuthMiddleware, scimController.createScimUserRoute);
router.put('/scim/v2/Users/:id', scimController.scimAuthMiddleware, scimController.updateScimUserRoute);
router.patch('/scim/v2/Users/:id', scimController.scimAuthMiddleware, scimController.patchScimUserRoute);
router.delete('/scim/v2/Users/:id', scimController.scimAuthMiddleware, scimController.deleteScimUserRoute);

router.get('/scim/v2/Groups', scimController.scimAuthMiddleware, scimController.listScimGroups);
router.post('/scim/v2/Groups', scimController.scimAuthMiddleware, scimController.createScimGroupRoute);
router.delete('/scim/v2/Groups/:id', scimController.scimAuthMiddleware, scimController.deleteScimGroupRoute);

// Admin endpoints for SCIM configuration (require JWT auth)
router.get('/admin/scim/config/:tenantId', authMiddleware, scimController.getScimConfig);
router.post('/admin/scim/config', authMiddleware, scimController.createOrUpdateScimConfig);

export default router;
