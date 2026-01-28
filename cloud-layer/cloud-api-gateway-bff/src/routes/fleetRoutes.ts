import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { jwtAuthMiddleware, requireRole } from '../middlewares/authMiddleware';

const router = Router();
const FLEET_SERVICE_URL = process.env.FLEET_SERVICE_URL || 'http://cloud-fleet-management:3000';

const fleetProxy = createProxyMiddleware({
    target: FLEET_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api/v1/fleet': '/api', // Rewrite /api/v1/fleet/xyz -> /api/xyz
        // Note: Gap analysis example used /api/firmwares.
        // If backend is /api/firmwares, and BFF is /api/v1/fleet/firmwares
        // Then we need to replace /api/v1/fleet with /api
    },
});

router.use(jwtAuthMiddleware);

// Firmware management (Admin only)
// Since we have specific requirements like file upload and admin checks, we might need specific handlers
// BUT createProxyMiddleware handles streams (file uploads) well.
// We can use authentication middleware before the proxy.

// Admin only routes
router.use('/firmwares', requireRole('platform_admin'), fleetProxy);
router.use('/campaigns', requireRole('platform_admin'), fleetProxy);

// General devices routes (Read access or user access)
router.use('/devices', fleetProxy);

export default router;
