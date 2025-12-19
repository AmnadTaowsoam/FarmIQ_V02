import express from 'express'
import {
  getStations,
  getStation,
  createStationHandler,
  updateStationHandler,
  deleteStationHandler,
} from '../controllers/stationController'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import { validateStation } from '../middlewares/validationMiddleware'

const router = express.Router()

// Apply JWT auth middleware (pluggable)
router.use(jwtAuthMiddleware)

/**
 * @swagger
 * /api/v1/stations:
 *   get:
 *     summary: Get all stations for tenant
 *     tags: [Stations]
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
 *     responses:
 *       200:
 *         description: List of stations
 */
router.get('/', getStations)

/**
 * @swagger
 * /api/v1/stations/{id}:
 *   get:
 *     summary: Get station by ID
 *     tags: [Stations]
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
 *         description: Station details
 *       404:
 *         description: Station not found
 */
router.get('/:id', getStation)

/**
 * @swagger
 * /api/v1/stations:
 *   post:
 *     summary: Create a new station
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - farmId
 *               - barnId
 *             properties:
 *               name:
 *                 type: string
 *               farmId:
 *                 type: string
 *                 format: uuid
 *               barnId:
 *                 type: string
 *                 format: uuid
 *               stationType:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       201:
 *         description: Station created
 */
router.post('/', validateStation, createStationHandler)

/**
 * @swagger
 * /api/v1/stations/{id}:
 *   patch:
 *     summary: Update station
 *     tags: [Stations]
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
 *               name:
 *                 type: string
 *               stationType:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Station updated
 */
router.patch('/:id', validateStation, updateStationHandler)

/**
 * @swagger
 * /api/v1/stations/{id}:
 *   delete:
 *     summary: Delete station
 *     tags: [Stations]
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
 *         description: Station deleted
 */
router.delete('/:id', deleteStationHandler)

export default router

