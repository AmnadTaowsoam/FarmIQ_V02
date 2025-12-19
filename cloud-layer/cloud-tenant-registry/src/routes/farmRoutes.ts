import express from 'express'
import {
  getFarms,
  getFarm,
  createFarmHandler,
  updateFarmHandler,
  deleteFarmHandler,
} from '../controllers/farmController'
import { validateFarm } from '../middlewares/validationMiddleware'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'

const router = express.Router()

// Apply JWT auth middleware (pluggable)
router.use(jwtAuthMiddleware)

/**
 * @swagger
 * /api/v1/farms:
 *   get:
 *     summary: Get all farms for tenant
 *     tags: [Farms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of farms
 *       400:
 *         description: Validation error
 */
router.get('/', getFarms)

/**
 * @swagger
 * /api/v1/farms/{id}:
 *   get:
 *     summary: Get farm by ID
 *     tags: [Farms]
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
 *         description: Farm details
 *       404:
 *         description: Farm not found
 */
router.get('/:id', getFarm)

/**
 * @swagger
 * /api/v1/farms:
 *   post:
 *     summary: Create a new farm
 *     tags: [Farms]
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
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       201:
 *         description: Farm created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Conflict (duplicate name)
 */
router.post('/', validateFarm, createFarmHandler)

/**
 * @swagger
 * /api/v1/farms/{id}:
 *   patch:
 *     summary: Update farm
 *     tags: [Farms]
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
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Farm updated
 *       404:
 *         description: Farm not found
 */
router.patch('/:id', validateFarm, updateFarmHandler)

/**
 * @swagger
 * /api/v1/farms/{id}:
 *   delete:
 *     summary: Delete farm
 *     tags: [Farms]
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
 *         description: Farm deleted
 *       404:
 *         description: Farm not found
 */
router.delete('/:id', deleteFarmHandler)

export default router

