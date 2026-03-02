import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { jwtAuthMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://cloud-identity-access:3000';

const identityProxy = createProxyMiddleware({
    target: IDENTITY_SERVICE_URL,
    changeOrigin: true,
    // This router is mounted at /api/v1/identity, so proxied paths arrive as "/<rest>".
    // Prefix with /api/v1 to match identity-service route mounts.
    pathRewrite: (path) => `/api/v1${path}`,
});

router.use(jwtAuthMiddleware);
router.use('/', identityProxy);

export default router;
