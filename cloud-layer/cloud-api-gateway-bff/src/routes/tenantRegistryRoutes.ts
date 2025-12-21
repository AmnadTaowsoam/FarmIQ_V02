import express from 'express'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import {
  getTenantsHandler,
  getFarmsHandler,
  getBarnsHandler,
  getBatchesHandler,
  getDevicesHandler,
  getStationsHandler,
} from '../controllers/tenantRegistryController'

const router = express.Router()

// All tenant registry routes require JWT auth
router.use(jwtAuthMiddleware)

/**
 * Tenant Registry Endpoints
 */
router.get('/tenants', getTenantsHandler)

// Farms
router.get('/farms', getFarmsHandler)

// Barns
router.get('/barns', getBarnsHandler)

// Batches
router.get('/batches', getBatchesHandler)

// Devices
router.get('/devices', getDevicesHandler)

// Stations
router.get('/stations', getStationsHandler)

export default router

