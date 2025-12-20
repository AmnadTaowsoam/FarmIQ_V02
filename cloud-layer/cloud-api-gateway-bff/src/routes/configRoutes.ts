import express from 'express'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import {
  getConfigContextHandler,
  getThresholdsHandler,
  upsertThresholdHandler,
  getTargetsHandler,
  upsertTargetHandler,
} from '../controllers/configController'

const router = express.Router()

router.use(jwtAuthMiddleware)

router.get('/context', getConfigContextHandler)
router.get('/thresholds', getThresholdsHandler)
router.put('/thresholds', upsertThresholdHandler)
router.get('/targets', getTargetsHandler)
router.put('/targets', upsertTargetHandler)

export default router

