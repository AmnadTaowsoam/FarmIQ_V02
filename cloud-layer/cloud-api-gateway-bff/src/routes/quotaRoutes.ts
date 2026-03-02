import { Router } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { jwtAuthMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const TENANT_REGISTRY_URL = process.env.REGISTRY_BASE_URL || 'http://cloud-tenant-registry:3000';

const quotaProxy = createProxyMiddleware({
    target: TENANT_REGISTRY_URL,
    changeOrigin: true,
    on: {
        proxyReq: fixRequestBody,
    },
    pathRewrite: (path, req) => {
        const tenantId = (req as any).params?.tenantId as string | undefined;
        if (!tenantId) {
            return `/api/v1${path}`;
        }
        // `path` can be "/" (base quota) or "/check".
        const suffix = path === '/' ? '' : path;
        return `/api/v1/tenants/${tenantId}/quota${suffix}`;
    },
});

const rateLimitsProxy = createProxyMiddleware({
    target: TENANT_REGISTRY_URL,
    changeOrigin: true,
    on: {
        proxyReq: fixRequestBody,
    },
    pathRewrite: (path, req) => {
        const tenantId = (req as any).params?.tenantId as string | undefined;
        if (!tenantId) {
            return `/api/v1${path}`;
        }
        // `path` is "/" for get/post/delete rate-limits endpoints.
        const suffix = path === '/' ? '' : path;
        return `/api/v1/tenants/${tenantId}/rate-limits${suffix}`;
    },
});

router.use(jwtAuthMiddleware);

// Proxy specific quota paths
// We match /tenants/:id/quota and /tenants/:id/rate-limits
router.use('/tenants/:tenantId/quota', quotaProxy);
router.use('/tenants/:tenantId/rate-limits', rateLimitsProxy);

export default router;
