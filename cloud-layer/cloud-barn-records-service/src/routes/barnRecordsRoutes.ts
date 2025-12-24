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
  listMorbidityEventsHandler,
  listMortalityEventsHandler,
  listVaccineEventsHandler,
  listTreatmentEventsHandler,
  listWelfareChecksHandler,
  listHousingConditionsHandler,
  listGeneticProfilesHandler,
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
router.get(
  '/morbidity',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listMorbidityEventsHandler
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
router.get(
  '/mortality',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listMortalityEventsHandler
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
router.get(
  '/vaccines',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'viewer'),
  listVaccineEventsHandler
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
router.get(
  '/treatments',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'viewer'),
  listTreatmentEventsHandler
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
router.get(
  '/welfare-checks',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listWelfareChecksHandler
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
router.get(
  '/housing-conditions',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listHousingConditionsHandler
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
router.get(
  '/genetics',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'viewer'),
  listGeneticProfilesHandler
)

export default router

