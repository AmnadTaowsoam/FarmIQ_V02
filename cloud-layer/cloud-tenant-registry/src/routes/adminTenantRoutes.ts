import express from 'express'
import { getAdminTenantsHandler } from '../controllers/tenantController'

const router = express.Router()

/**
 * @swagger
 * /api/v1/admin/tenants:
 *   get:
 *     summary: Get admin tenants list with counts
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
 *         name: region
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated tenants with counts
 *       500:
 *         description: Internal server error
 */
router.get('/tenants', getAdminTenantsHandler)

export default router
