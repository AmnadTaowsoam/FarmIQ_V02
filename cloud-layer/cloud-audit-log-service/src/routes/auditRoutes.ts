import express from 'express'
import {
  createAuditEventHandler,
  queryAuditEventsHandler,
  getAuditEventByIdHandler,
} from '../controllers/auditController'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import { internalAuthMiddleware } from '../middlewares/authMiddleware'

const router = express.Router()

/**
 * @swagger
 * /api/v1/audit/events:
 *   post:
 *     summary: Create audit event (internal/BFF)
 *     tags: [Audit]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenant_id
 *               - action
 *               - resource_type
 *               - summary
 *             properties:
 *               tenant_id:
 *                 type: string
 *               actor_id:
 *                 type: string
 *               actor_role:
 *                 type: string
 *               action:
 *                 type: string
 *               resource_type:
 *                 type: string
 *               resource_id:
 *                 type: string
 *               summary:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Audit event created
 *   get:
 *     summary: Query audit events
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: tenant_id
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: actor
 *         in: query
 *         schema:
 *           type: string
 *       - name: action
 *         in: query
 *         schema:
 *           type: string
 *       - name: resource_type
 *         in: query
 *         schema:
 *           type: string
 *       - name: from
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: to
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 25
 *     responses:
 *       200:
 *         description: List of audit events
 */
router.post('/events', internalAuthMiddleware, createAuditEventHandler)
router.get('/events', jwtAuthMiddleware, queryAuditEventsHandler)
router.get('/events/:id', jwtAuthMiddleware, getAuditEventByIdHandler)

export default router
