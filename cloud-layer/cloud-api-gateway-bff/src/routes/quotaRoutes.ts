import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { jwtAuthMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const TENANT_REGISTRY_URL = process.env.REGISTRY_BASE_URL || 'http://cloud-tenant-registry:3000';

const quotaProxy = createProxyMiddleware({
    target: TENANT_REGISTRY_URL,
    changeOrigin: true,
    // pathRewrite: not needed if we want to forward /api/v1/tenants/:id/quota as is to backend /api/v1/tenants/:id/quota
    // assuming we mount this at /api/v1
});

router.use(jwtAuthMiddleware);

// Proxy specific quota paths
// We match /tenants/:id/quota and /tenants/:id/rate-limits
router.use('/tenants/:tenantId/quota', quotaProxy);
router.use('/tenants/:tenantId/rate-limits', quotaProxy);

export default router;
