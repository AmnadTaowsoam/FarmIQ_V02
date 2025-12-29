import { Router } from 'express';
import { ingestBatch, handshake, getDedupeEntries } from '../controllers/ingestionController';
import { cloudAuthMiddleware } from '../middlewares/cloudAuth';

const router = Router();

router.post('/batch', cloudAuthMiddleware, ingestBatch);
router.get('/diagnostics/handshake', cloudAuthMiddleware, handshake);
router.get('/diagnostics/dedupe', cloudAuthMiddleware, getDedupeEntries);

export default router;
