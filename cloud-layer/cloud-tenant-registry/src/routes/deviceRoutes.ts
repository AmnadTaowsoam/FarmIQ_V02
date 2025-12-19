import express from 'express'
import {
  getDevices,
  getDevice,
  createDeviceHandler,
  updateDeviceHandler,
  deleteDeviceHandler,
} from '../controllers/deviceController'
import { validateDevice } from '../middlewares/validationMiddleware'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'

const router = express.Router()

// Apply JWT auth middleware (pluggable)
router.use(jwtAuthMiddleware)

/**
 * @swagger
 * /api/v1/devices:
 *   get:
 *     summary: Get all devices for tenant
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: string
 *       - in: query
 *         name: barnId
 *         schema:
 *           type: string
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of devices
 */
router.get('/', getDevices)

/**
 * @swagger
 * /api/v1/devices/{id}:
 *   get:
 *     summary: Get device by ID
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device details
 *       404:
 *         description: Device not found
 */
router.get('/:id', getDevice)

/**
 * @swagger
 * /api/v1/devices:
 *   post:
 *     summary: Create a new device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceType
 *               - serialNumber
 *             properties:
 *               deviceType:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               farmId:
 *                 type: string
 *               barnId:
 *                 type: string
 *               batchId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Device created
 *       409:
 *         description: Conflict (duplicate serialNumber)
 */
router.post('/', validateDevice, createDeviceHandler)

/**
 * @swagger
 * /api/v1/devices/{id}:
 *   patch:
 *     summary: Update device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               deviceType:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               farmId:
 *                 type: string
 *               barnId:
 *                 type: string
 *               batchId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Device updated
 */
router.patch('/:id', validateDevice, updateDeviceHandler)

/**
 * @swagger
 * /api/v1/devices/{id}:
 *   delete:
 *     summary: Delete device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Device deleted
 */
router.delete('/:id', deleteDeviceHandler)

export default router

