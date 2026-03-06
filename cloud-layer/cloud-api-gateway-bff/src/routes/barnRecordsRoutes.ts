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
  listMortalityHandler,
  listMorbidityHandler,
  listVaccinesHandler,
  listTreatmentsHandler,
  listWelfareChecksHandler,
  listHousingConditionsHandler,
  listGeneticsHandler,
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
router.get('/barn-records/mortality', listMortalityHandler)

/**
 * Morbidity Events
 */
router.post('/barn-records/morbidity', createMorbidityHandler)
router.get('/barn-records/morbidity', listMorbidityHandler)

/**
 * Vaccine Events
 */
router.post('/barn-records/vaccines', createVaccineHandler)
router.get('/barn-records/vaccines', listVaccinesHandler)

/**
 * Treatment Events
 */
router.post('/barn-records/treatments', createTreatmentHandler)
router.get('/barn-records/treatments', listTreatmentsHandler)

/**
 * Welfare Checks
 */
router.post('/barn-records/welfare-checks', createWelfareCheckHandler)
router.get('/barn-records/welfare-checks', listWelfareChecksHandler)

/**
 * Housing Conditions
 */
router.post('/barn-records/housing-conditions', createHousingConditionHandler)
router.get('/barn-records/housing-conditions', listHousingConditionsHandler)

/**
 * Genetic Profiles
 */
router.post('/barn-records/genetics', createGeneticProfileHandler)
router.get('/barn-records/genetics', listGeneticsHandler)

/**
 * Daily Counts
 */
router.post('/barn-records/daily-counts', createDailyCountHandler)
router.get('/barn-records/daily-counts', listDailyCountsHandler)

export default router

