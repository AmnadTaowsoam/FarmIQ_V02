import { Router } from 'express';
import { ingestBatch } from '../controllers/ingestionController';

const router = Router();

router.post('/batch', ingestBatch);

export default router;
