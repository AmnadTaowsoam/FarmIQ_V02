import { Router } from 'express'
import * as usageController from '../controllers/usageController'
import * as invoiceController from '../controllers/invoiceController'
import * as subscriptionController from '../controllers/subscriptionController'
import { jwtAuthMiddleware, requireRole } from '../middlewares/authMiddleware'

const router = Router()

// Usage metrics routes
router.post('/usage', jwtAuthMiddleware, requireRole('platform_admin'), usageController.recordUsage)
router.get('/usage', jwtAuthMiddleware, usageController.getUsage)
router.get('/usage/aggregated', jwtAuthMiddleware, usageController.getAggregatedUsage)

// Invoice routes
router.post('/invoices', jwtAuthMiddleware, requireRole('platform_admin'), invoiceController.createInvoiceRoute)
router.get('/invoices', jwtAuthMiddleware, invoiceController.getInvoicesRoute)
router.get('/invoices/:id', jwtAuthMiddleware, invoiceController.getInvoiceByIdRoute)
router.patch('/invoices/:id/status', jwtAuthMiddleware, requireRole('platform_admin'), invoiceController.updateInvoiceStatusRoute)

// Subscription routes
router.post('/subscriptions', jwtAuthMiddleware, requireRole('platform_admin'), subscriptionController.upsertSubscriptionRoute)
router.get('/subscriptions/:tenantId', jwtAuthMiddleware, subscriptionController.getSubscriptionRoute)
router.patch('/subscriptions/:tenantId/cancel', jwtAuthMiddleware, requireRole('platform_admin'), subscriptionController.cancelSubscriptionRoute)

export default router
