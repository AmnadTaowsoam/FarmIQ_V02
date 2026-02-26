import express from 'express'
import { jwtAuthMiddleware, requireRole } from '../middlewares/authMiddleware'
import {
  getTenantsHandler,
  getAdminTenantsHandler,
  getAdminTenantByIdHandler,
  createTenantHandler,
  getAdminDevicesHandler,
  getAdminDeviceByIdHandler,
  getFarmsHandler,
  createFarmHandler,
  getBarnsHandler,
  createBarnHandler,
  getBatchesHandler,
  getDevicesHandler,
  createDeviceHandler,
  getStationsHandler,
} from '../controllers/tenantRegistryController'

const router = express.Router()

// All tenant registry routes require JWT auth
router.use(jwtAuthMiddleware)

/**
 * Tenant Registry Endpoints
 */
router.get('/tenants', getTenantsHandler)
router.get('/admin/tenants', requireRole('platform_admin'), getAdminTenantsHandler)
router.get('/admin/tenants/:id', requireRole('platform_admin'), getAdminTenantByIdHandler)
router.post('/admin/tenants', requireRole('platform_admin'), createTenantHandler)
router.get('/admin/devices', requireRole('platform_admin'), getAdminDevicesHandler)
router.get('/admin/devices/:id', requireRole('platform_admin'), getAdminDeviceByIdHandler)

// Farms
router.get('/farms', getFarmsHandler)
router.post('/farms', createFarmHandler)

// Barns
router.get('/barns', getBarnsHandler)
router.post('/barns', createBarnHandler)

// Batches
router.get('/batches', getBatchesHandler)

// Devices
router.get('/devices', getDevicesHandler)
router.post('/devices', createDeviceHandler)

// Stations
router.get('/stations', getStationsHandler)

export default router
