import express from 'express'
import {
  getBarns,
  getBarn,
  createBarnHandler,
  updateBarnHandler,
  deleteBarnHandler,
} from '../controllers/barnController'
import { validateBarn } from '../middlewares/validationMiddleware'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'

const router = express.Router()

// Apply JWT auth middleware (pluggable)
router.use(jwtAuthMiddleware)

/**
 * @swagger
 * /api/v1/barns:
 *   get:
 *     summary: Get all barns for tenant
 *     tags: [Barns]
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
 *     responses:
 *       200:
 *         description: List of barns
 */
router.get('/', getBarns)

/**
 * @swagger
 * /api/v1/barns/{id}:
 *   get:
 *     summary: Get barn by ID
 *     tags: [Barns]
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
 *         description: Barn details
 *       404:
 *         description: Barn not found
 */
router.get('/:id', getBarn)

/**
 * @swagger
 * /api/v1/barns:
 *   post:
 *     summary: Create a new barn
 *     tags: [Barns]
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
 *             properties:
 *               name:
 *                 type: string
 *               farmId:
 *                 type: string
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       201:
 *         description: Barn created
 */
router.post('/', validateBarn, createBarnHandler)

/**
 * @swagger
 * /api/v1/barns/{id}:
 *   patch:
 *     summary: Update barn
 *     tags: [Barns]
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
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Barn updated
 */
router.patch('/:id', validateBarn, updateBarnHandler)

/**
 * @swagger
 * /api/v1/barns/{id}:
 *   delete:
 *     summary: Delete barn
 *     tags: [Barns]
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
 *         description: Barn deleted
 */
router.delete('/:id', deleteBarnHandler)

export default router

