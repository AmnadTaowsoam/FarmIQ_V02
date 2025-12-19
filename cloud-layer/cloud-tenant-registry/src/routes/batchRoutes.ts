import express from 'express'
import {
  getBatches,
  getBatch,
  createBatchHandler,
  updateBatchHandler,
  deleteBatchHandler,
} from '../controllers/batchController'
import { validateBatch } from '../middlewares/validationMiddleware'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'

const router = express.Router()

// Apply JWT auth middleware (pluggable)
router.use(jwtAuthMiddleware)

/**
 * @swagger
 * /api/v1/batches:
 *   get:
 *     summary: Get all batches for tenant
 *     tags: [Batches]
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
 *         description: List of batches
 */
router.get('/', getBatches)

/**
 * @swagger
 * /api/v1/batches/{id}:
 *   get:
 *     summary: Get batch by ID
 *     tags: [Batches]
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
 *         description: Batch details
 *       404:
 *         description: Batch not found
 */
router.get('/:id', getBatch)

/**
 * @swagger
 * /api/v1/batches:
 *   post:
 *     summary: Create a new batch
 *     tags: [Batches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - species
 *               - farmId
 *               - barnId
 *             properties:
 *               species:
 *                 type: string
 *               farmId:
 *                 type: string
 *               barnId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [active, completed, cancelled]
 *     responses:
 *       201:
 *         description: Batch created
 */
router.post('/', validateBatch, createBatchHandler)

/**
 * @swagger
 * /api/v1/batches/{id}:
 *   patch:
 *     summary: Update batch
 *     tags: [Batches]
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
 *               species:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [active, completed, cancelled]
 *     responses:
 *       200:
 *         description: Batch updated
 */
router.patch('/:id', validateBatch, updateBatchHandler)

/**
 * @swagger
 * /api/v1/batches/{id}:
 *   delete:
 *     summary: Delete batch
 *     tags: [Batches]
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
 *         description: Batch deleted
 */
router.delete('/:id', deleteBatchHandler)

export default router

