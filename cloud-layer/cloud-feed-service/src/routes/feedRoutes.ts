import express from 'express'
import {
  createFeedFormulaHandler,
  listFeedFormulasHandler,
  createFeedIntakeRecordHandler,
  listFeedIntakeRecordsHandler,
  createFeedLotHandler,
  listFeedLotsHandler,
  createFeedDeliveryHandler,
  listFeedDeliveriesHandler,
  createFeedQualityResultHandler,
  listFeedQualityResultsHandler,
  createFeedProgramHandler,
  listFeedProgramsHandler,
  createFeedInventorySnapshotHandler,
  listFeedInventorySnapshotsHandler,
} from '../controllers/feedController'
import { jwtAuthMiddleware, requireRole } from '../middlewares/authMiddleware'
import {
  validateFeedFormula,
  validateFeedLot,
  validateFeedDelivery,
  validateFeedQualityResult,
  validateFeedIntakeRecord,
  validateFeedProgram,
  validateFeedInventorySnapshot,
} from '../middlewares/validationMiddleware'

const router = express.Router()

/**
 * Feed Formulas
 */
router.post(
  '/formulas',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager'),
  validateFeedFormula,
  createFeedFormulaHandler
)
router.get(
  '/formulas',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listFeedFormulasHandler
)

/**
 * Feed Lots
 */
router.post(
  '/lots',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager'),
  validateFeedLot,
  createFeedLotHandler
)
router.get(
  '/lots',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listFeedLotsHandler
)

/**
 * Feed Deliveries
 */
router.post(
  '/deliveries',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager'),
  validateFeedDelivery,
  createFeedDeliveryHandler
)
router.get(
  '/deliveries',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listFeedDeliveriesHandler
)

/**
 * Feed Quality Results
 */
router.post(
  '/quality-results',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager'),
  validateFeedQualityResult,
  createFeedQualityResultHandler
)
router.get(
  '/quality-results',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listFeedQualityResultsHandler
)

/**
 * Feed Intake Records
 */
router.post(
  '/intake-records',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator'),
  validateFeedIntakeRecord,
  createFeedIntakeRecordHandler
)
router.get(
  '/intake-records',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listFeedIntakeRecordsHandler
)

/**
 * Feed Programs (optional)
 */
router.post(
  '/programs',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager'),
  validateFeedProgram,
  createFeedProgramHandler
)
router.get(
  '/programs',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listFeedProgramsHandler
)

/**
 * Feed Inventory Snapshots (optional)
 */
router.post(
  '/inventory-snapshots',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager'),
  validateFeedInventorySnapshot,
  createFeedInventorySnapshotHandler
)
router.get(
  '/inventory-snapshots',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listFeedInventorySnapshotsHandler
)

export default router

