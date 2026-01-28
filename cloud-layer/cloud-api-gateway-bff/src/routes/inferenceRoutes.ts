import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { jwtAuthMiddleware, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// URLs
const CLOUD_INFERENCE_URL = process.env.CLOUD_INFERENCE_URL || 'http://cloud-inference-server:5139';
const EDGE_INFERENCE_URL = process.env.EDGE_INFERENCE_URL || 'http://cloud-hybrid-router:5140'; // Using hybrid router as edge entry/mock?
// Actually gap analysis says: "const targetUrl = edgeAvailable ? ... : ..."
// Implementation of dynamic routing in middleware:

const inferenceProxy = createProxyMiddleware({
    target: CLOUD_INFERENCE_URL, // Default to cloud
    changeOrigin: true,
    pathRewrite: {
        '^/api/v1/inference': '/api/v1',
    },
    router: async (req) => {
        // Logic to determine if we should route to edge or cloud
        // This is the hybrid routing logic
        // For now, we can check a header or keep default
        // Gap analysis: "// Hybrid routing logic - check if edge is available"
        // If we implement complex logic here, it might slow down.
        // We will stick to CLOUD_INFERENCE_URL default unless 'x-prefer-edge' header exists?
        // Or maybe just route everything to hybrid-router if it handles the decision?
        // Gap analysis line 28: cloud-hybrid-router 5140 Created.
        // So effectively we should route "inference" requests to cloud-hybrid-router?
        // "router.post('/inference/predict', ... Hybrid routing logic"

        // Let's route /predict to hybrid router, others to respective services.
        return CLOUD_INFERENCE_URL;
    }
});

// Hybrid Router for predictions
const predictProxy = createProxyMiddleware({
    target: process.env.CLOUD_HYBRID_ROUTER_URL || 'http://cloud-hybrid-router:5140',
    changeOrigin: true,
    pathRewrite: {
        '^/api/v1/inference/predict': '/predict', // Check hybrid router API
        // Gap analysis code: proxyTo(targetUrl) matches /api/v1/predict on backend
    }
});

router.use(jwtAuthMiddleware);

router.post('/predict', predictProxy);
router.use('/', inferenceProxy); // Catch all others

export default router;
