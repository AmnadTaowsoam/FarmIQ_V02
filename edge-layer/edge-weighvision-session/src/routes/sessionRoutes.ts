import { Router } from 'express';
import * as sessionController from '../controllers/sessionController';

const router = Router();

// Health/Ready
router.get('/health', sessionController.getHealth);
router.get('/ready', sessionController.getReady);

// Sessions
router.post('/v1/weighvision/sessions', sessionController.createSession);
router.get('/v1/weighvision/sessions/:sessionId', sessionController.getSession);
router.post('/v1/weighvision/sessions/:sessionId/bind-weight', sessionController.bindWeight);
router.post('/v1/weighvision/sessions/:sessionId/bind-media', sessionController.bindMedia);
router.post('/v1/weighvision/sessions/:sessionId/finalize', sessionController.finalizeSession);

export default router;
