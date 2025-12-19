import express from 'express'
import {
  getTenants,
  getTenant,
  createTenantHandler,
  updateTenantHandler,
  deleteTenantHandler,
} from '../controllers/tenantController'
import { validateTenant } from '../middlewares/validationMiddleware'

const router = express.Router()

/**
 * @swagger
 * /api/v1/tenants:
 *   get:
 *     summary: Get all tenants
 *     tags: [Tenants]
 *     responses:
 *       200:
 *         description: List of tenants
 *       500:
 *         description: Internal server error
 */
router.get('/', getTenants)

/**
 * @swagger
 * /api/v1/tenants/{id}:
 *   get:
 *     summary: Get tenant by ID
 *     tags: [Tenants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tenant details
 *       404:
 *         description: Tenant not found
 */
router.get('/:id', getTenant)

/**
 * @swagger
 * /api/v1/tenants:
 *   post:
 *     summary: Create a new tenant
 *     tags: [Tenants]
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
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       201:
 *         description: Tenant created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Conflict (duplicate name)
 */
router.post('/', validateTenant, createTenantHandler)

/**
 * @swagger
 * /api/v1/tenants/{id}:
 *   patch:
 *     summary: Update tenant
 *     tags: [Tenants]
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
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       200:
 *         description: Tenant updated
 *       404:
 *         description: Tenant not found
 */
router.patch('/:id', validateTenant, updateTenantHandler)

/**
 * @swagger
 * /api/v1/tenants/{id}:
 *   delete:
 *     summary: Delete tenant
 *     tags: [Tenants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Tenant deleted
 *       404:
 *         description: Tenant not found
 */
router.delete('/:id', deleteTenantHandler)

export default router

