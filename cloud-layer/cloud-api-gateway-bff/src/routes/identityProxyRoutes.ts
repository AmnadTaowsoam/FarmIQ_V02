import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { jwtAuthMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://cloud-identity-access:3000';

const identityProxy = createProxyMiddleware({
    target: IDENTITY_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api/v1/identity': '/api/v1', // Maps /api/v1/identity/rbac -> /api/v1/rbac
    },
});

router.use(jwtAuthMiddleware);
router.use('/', identityProxy);

export default router;
