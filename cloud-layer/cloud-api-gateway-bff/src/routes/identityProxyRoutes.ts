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
    on: {
        proxyReq: (proxyReq, req) => {
            // express.json() has already consumed the incoming stream.
            // Re-write JSON body for proxied mutating requests.
            const method = (req.method || 'GET').toUpperCase();
            if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;

            const body = (req as any).body;
            if (!body || typeof body !== 'object' || Object.keys(body).length === 0) return;

            const bodyData = JSON.stringify(body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        },
    },
});

router.use(jwtAuthMiddleware);
router.use('/', identityProxy);

export default router;
