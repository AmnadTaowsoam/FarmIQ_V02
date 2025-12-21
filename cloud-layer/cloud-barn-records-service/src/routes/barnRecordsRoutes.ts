import express from 'express'
import {
  createMorbidityEventHandler,
  createMortalityEventHandler,
  createVaccineEventHandler,
  createTreatmentEventHandler,
  createDailyCountHandler,
  listDailyCountsHandler,
  createWelfareCheckHandler,
  createHousingConditionHandler,
  createGeneticProfileHandler,
} from '../controllers/barnRecordsController'
import { jwtAuthMiddleware, requireRole } from '../middlewares/authMiddleware'
import {
  validateMorbidityEvent,
  validateMortalityEvent,
  validateVaccineEvent,
  validateTreatmentEvent,
  validateDailyCount,
  validateWelfareCheck,
  validateHousingCondition,
  validateGeneticProfile,
} from '../middlewares/validationMiddleware'

const router = express.Router()

/**
 * Morbidity Events
 */
router.post(
  '/morbidity',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator'),
  validateMorbidityEvent,
  createMorbidityEventHandler
)

/**
 * Mortality Events
 */
router.post(
  '/mortality',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator'),
  validateMortalityEvent,
  createMortalityEventHandler
)

/**
 * Vaccine Events
 */
router.post(
  '/vaccines',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager'),
  validateVaccineEvent,
  createVaccineEventHandler
)

/**
 * Treatment Events
 */
router.post(
  '/treatments',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager'),
  validateTreatmentEvent,
  createTreatmentEventHandler
)

/**
 * Daily Counts
 */
router.post(
  '/daily-counts',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager'),
  validateDailyCount,
  createDailyCountHandler
)
router.get(
  '/daily-counts',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listDailyCountsHandler
)

/**
 * Welfare Checks
 */
router.post(
  '/welfare-checks',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator'),
  validateWelfareCheck,
  createWelfareCheckHandler
)

/**
 * Housing Conditions
 */
router.post(
  '/housing-conditions',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator'),
  validateHousingCondition,
  createHousingConditionHandler
)

/**
 * Genetic Profiles
 */
router.post(
  '/genetics',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager'),
  validateGeneticProfile,
  createGeneticProfileHandler
)

export default router

