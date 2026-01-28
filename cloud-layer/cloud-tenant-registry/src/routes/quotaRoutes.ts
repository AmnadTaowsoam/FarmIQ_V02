import { Router } from 'express';
import * as quotaController from '../controllers/quotaController';
import { jwtAuthMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// All quota endpoints require authentication
router.use(jwtAuthMiddleware);

// Tenant quotas
router.get('/tenants/:tenantId/quota', quotaController.getTenantQuotaRoute);
router.patch('/tenants/:tenantId/quota', quotaController.updateTenantQuotaRoute);
router.get('/tenants/:tenantId/quota/check', quotaController.checkTenantQuotaRoute);

// Tenant rate limits
router.get('/tenants/:tenantId/rate-limits', quotaController.getTenantRateLimitsRoute);
router.post('/tenants/:tenantId/rate-limits', quotaController.upsertTenantRateLimitRoute);
router.delete('/tenants/:tenantId/rate-limits', quotaController.deleteTenantRateLimitRoute);

export default router;
