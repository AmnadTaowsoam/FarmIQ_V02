import express from 'express'
import { getAdminDevicesHandler, getAdminDeviceByIdHandler } from '../controllers/deviceController'

const router = express.Router()

/**
 * @swagger
 * /api/v1/admin/devices:
 *   get:
 *     summary: Get admin devices list
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Paginated devices
 *       500:
 *         description: Internal server error
 */
router.get('/devices', getAdminDevicesHandler)

/**
 * @swagger
 * /api/v1/admin/devices/{id}:
 *   get:
 *     summary: Get admin device by ID
 *     tags: [Admin]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device details
 *       404:
 *         description: Device not found
 */
router.get('/devices/:id', getAdminDeviceByIdHandler)

export default router
