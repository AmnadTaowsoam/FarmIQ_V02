import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { jwtAuthMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const ANALYTICS_SERVICE_URL = process.env.ADVANCED_ANALYTICS_URL || 'http://cloud-advanced-analytics:8000';

const analyticsProxy = createProxyMiddleware({
    target: ANALYTICS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api/v1/analytics': '/api/v1', // Maps /api/v1/analytics/cohorts -> /api/v1/cohorts
    },
});

router.use(jwtAuthMiddleware);
router.use('/', analyticsProxy);

export default router;
