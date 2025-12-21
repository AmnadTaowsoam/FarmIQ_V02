import express from 'express'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import {
  getFeedingKpiHandler,
  createIntakeRecordHandler,
  listIntakeRecordsHandler,
  createLotHandler,
  listLotsHandler,
  createDeliveryHandler,
  listDeliveriesHandler,
  createQualityResultHandler,
  listQualityResultsHandler,
  createFormulaHandler,
  listFormulasHandler,
  createProgramHandler,
  listProgramsHandler,
} from '../controllers/feedController'

const router = express.Router()

// All feed routes require JWT auth
router.use(jwtAuthMiddleware)

/**
 * KPI Endpoints
 */
router.get('/kpi/feeding', getFeedingKpiHandler)

/**
 * Feed Intake Records
 */
router.post('/feed/intake-records', createIntakeRecordHandler)
router.get('/feed/intake-records', listIntakeRecordsHandler)

/**
 * Feed Lots
 */
router.post('/feed/lots', createLotHandler)
router.get('/feed/lots', listLotsHandler)

/**
 * Feed Deliveries
 */
router.post('/feed/deliveries', createDeliveryHandler)
router.get('/feed/deliveries', listDeliveriesHandler)

/**
 * Feed Quality Results
 */
router.post('/feed/quality-results', createQualityResultHandler)
router.get('/feed/quality-results', listQualityResultsHandler)

/**
 * Feed Formulas
 */
router.post('/feed/formulas', createFormulaHandler)
router.get('/feed/formulas', listFormulasHandler)

/**
 * Feed Programs (feature-flagged, optional)
 */
router.post('/feed/programs', createProgramHandler)
router.get('/feed/programs', listProgramsHandler)

export default router

