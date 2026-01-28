import { Router } from 'express';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import { jwtAuthMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://cloud-billing-service:3000';

// Helper to create proxy middleware
const proxy = (targetPath: string) => createProxyMiddleware({
    target: BILLING_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => {
        // If the target path contains parameters (e.g. :id), we rely on the original path
        // OR we just use the targetPath provided if it's a fixed path.
        // However, the gap analysis example: router.get('/subscriptions', proxy('/api/v1/subscriptions'))
        // implies we want to map /billing/subscriptions -> /api/v1/subscriptions

        // Simple rewrite: replace the route mount prefix with the target prefix
        // But since we mount at /api/v1/billing, path is just /subscriptions
        // We want /api/v1/subscriptions on the target
        return targetPath;
        // Wait, if I return a fixed string, dynamic params won't work?
        // standard pathRewrite: { '^/api/v1/billing': '/api/v1' }
    },
    // If we use standard pathRewrite with a regex, it handles dynamic params automatically.
});

// Better proxy approach for this structure:
const billingProxy = createProxyMiddleware({
    target: BILLING_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api/v1/billing': '/api/v1', // Rewrite /api/v1/billing/xyz -> /api/v1/xyz
    },
});

router.use(jwtAuthMiddleware);

// Mount the proxy for all sub-paths
// If we mount this router at /api/v1/billing, then any request to /api/v1/billing/*
// will be handled here.
// We can just use router.use('/', billingProxy) to catch everything.

// However, the gap analysis specified individual routes.
// "router.get('/subscriptions', proxy('/api/v1/subscriptions'));"
// This implies they might want specific control or documentation.
// But a wildcard proxy is cleaner if the API structure matches.
// Given "Deliverables" listed specific routes, I will define them but map them to the proxy.

// Actually, using a single middleware with pathRewrite is much cleaner and robust.
router.use('/', billingProxy);

export default router;
