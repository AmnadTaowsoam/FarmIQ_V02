import express from 'express'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import {
  getSensorsHandler,
  getSensorHandler,
  createSensorHandler,
  updateSensorHandler,
  getBindingsHandler,
  createBindingHandler,
  getCalibrationsHandler,
  createCalibrationHandler,
} from '../controllers/sensorsController'

const router = express.Router()

// All sensor routes require JWT auth
router.use(jwtAuthMiddleware)

/**
 * Sensor Endpoints
 */
router.get('/sensors', getSensorsHandler)
router.get('/sensors/:sensorId', getSensorHandler)
router.post('/sensors', createSensorHandler)
router.patch('/sensors/:sensorId', updateSensorHandler)

/**
 * Sensor Bindings
 */
router.get('/sensors/:sensorId/bindings', getBindingsHandler)
router.post('/sensors/:sensorId/bindings', createBindingHandler)

/**
 * Sensor Calibrations
 */
router.get('/sensors/:sensorId/calibrations', getCalibrationsHandler)
router.post('/sensors/:sensorId/calibrations', createCalibrationHandler)

export default router

