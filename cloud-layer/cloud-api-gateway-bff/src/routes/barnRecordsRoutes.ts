import express from 'express'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import {
  createMortalityHandler,
  createMorbidityHandler,
  createVaccineHandler,
  createTreatmentHandler,
  createWelfareCheckHandler,
  createHousingConditionHandler,
  createGeneticProfileHandler,
  createDailyCountHandler,
  listDailyCountsHandler,
} from '../controllers/barnRecordsController'

const router = express.Router()

// All barn-records routes require JWT auth
router.use(jwtAuthMiddleware)

/**
 * Barn Records Endpoints
 * Note: RBAC enforcement per contract:
 * - POST endpoints: tenant_admin, farm_manager (some allow house_operator)
 * - GET endpoints: viewer+ (viewer, house_operator, farm_manager, tenant_admin)
 * 
 * RBAC is enforced in downstream services; BFF proxies with auth headers
 */

/**
 * Mortality Events
 */
router.post('/barn-records/mortality', createMortalityHandler)

/**
 * Morbidity Events
 */
router.post('/barn-records/morbidity', createMorbidityHandler)

/**
 * Vaccine Events
 */
router.post('/barn-records/vaccines', createVaccineHandler)

/**
 * Treatment Events
 */
router.post('/barn-records/treatments', createTreatmentHandler)

/**
 * Welfare Checks
 */
router.post('/barn-records/welfare-checks', createWelfareCheckHandler)

/**
 * Housing Conditions
 */
router.post('/barn-records/housing-conditions', createHousingConditionHandler)

/**
 * Genetic Profiles
 */
router.post('/barn-records/genetics', createGeneticProfileHandler)

/**
 * Daily Counts
 */
router.post('/barn-records/daily-counts', createDailyCountHandler)
router.get('/barn-records/daily-counts', listDailyCountsHandler)

export default router

