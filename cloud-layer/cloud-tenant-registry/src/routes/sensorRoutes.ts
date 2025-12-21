import express from 'express'
import {
  getSensors,
  getSensor,
  createSensorHandler,
  updateSensorHandler,
  getBindings,
  createBindingHandler,
  getCalibrations,
  createCalibrationHandler,
} from '../controllers/sensorController'
import {
  validateSensor,
  validateSensorUpdate,
  validateSensorBinding,
  validateSensorCalibration,
} from '../middlewares/validationMiddleware'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'

const router = express.Router()

// Apply JWT auth middleware
router.use(jwtAuthMiddleware)

/**
 * @swagger
 * /api/v1/sensors:
 *   get:
 *     summary: Get all sensors for tenant
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *       - in: query
 *         name: barnId
 *         schema:
 *           type: string
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: enabled
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of sensors
 */
router.get('/', getSensors)

/**
 * @swagger
 * /api/v1/sensors/{sensorId}:
 *   get:
 *     summary: Get sensor by sensorId
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sensorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sensor details
 *       404:
 *         description: Sensor not found
 */
router.get('/:sensorId', getSensor)

/**
 * @swagger
 * /api/v1/sensors:
 *   post:
 *     summary: Create a new sensor
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sensorId
 *               - type
 *               - unit
 *             properties:
 *               sensorId:
 *                 type: string
 *               type:
 *                 type: string
 *               unit:
 *                 type: string
 *               label:
 *                 type: string
 *               barnId:
 *                 type: string
 *               zone:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Sensor created
 *       409:
 *         description: Conflict (duplicate sensorId)
 */
router.post('/', validateSensor, createSensorHandler)

/**
 * @swagger
 * /api/v1/sensors/{sensorId}:
 *   patch:
 *     summary: Update sensor
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sensorId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               barnId:
 *                 type: string
 *               zone:
 *                 type: string
 *               unit:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sensor updated
 *       404:
 *         description: Sensor not found
 */
router.patch('/:sensorId', validateSensorUpdate, updateSensorHandler)

/**
 * @swagger
 * /api/v1/sensors/{sensorId}/bindings:
 *   get:
 *     summary: Get bindings for a sensor
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sensorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of bindings
 *       404:
 *         description: Sensor not found
 */
router.get('/:sensorId/bindings', getBindings)

/**
 * @swagger
 * /api/v1/sensors/{sensorId}/bindings:
 *   post:
 *     summary: Create a binding for a sensor
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sensorId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - protocol
 *               - effectiveFrom
 *             properties:
 *               deviceId:
 *                 type: string
 *               protocol:
 *                 type: string
 *                 enum: [mqtt, modbus, opcua, http]
 *               channel:
 *                 type: string
 *               samplingRate:
 *                 type: integer
 *               effectiveFrom:
 *                 type: string
 *                 format: date-time
 *               effectiveTo:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Binding created
 *       409:
 *         description: Conflict (overlapping binding)
 *       404:
 *         description: Sensor or device not found
 */
router.post('/:sensorId/bindings', validateSensorBinding, createBindingHandler)

/**
 * @swagger
 * /api/v1/sensors/{sensorId}/calibrations:
 *   get:
 *     summary: Get calibrations for a sensor
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sensorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of calibrations
 *       404:
 *         description: Sensor not found
 */
router.get('/:sensorId/calibrations', getCalibrations)

/**
 * @swagger
 * /api/v1/sensors/{sensorId}/calibrations:
 *   post:
 *     summary: Create a calibration for a sensor
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sensorId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - offset
 *               - gain
 *               - method
 *               - performedAt
 *               - performedBy
 *             properties:
 *               offset:
 *                 type: number
 *               gain:
 *                 type: number
 *               method:
 *                 type: string
 *               performedAt:
 *                 type: string
 *                 format: date-time
 *               performedBy:
 *                 type: string
 *     responses:
 *       201:
 *         description: Calibration created
 *       404:
 *         description: Sensor not found
 */
router.post('/:sensorId/calibrations', validateSensorCalibration, createCalibrationHandler)

export default router

