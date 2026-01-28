import { Request, Response } from 'express'
import {
  upsertSubscription,
  getSubscription,
  cancelSubscription,
} from '../services/subscriptionService'
import { logger } from '../utils/logger'

/**
 * Create or update subscription
 */
export async function upsertSubscriptionRoute(req: Request, res: Response) {
  try {
    const { tenantId, plan, billingCycle, stripeSubscriptionId } = req.body

    if (!tenantId || !plan || !billingCycle) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId, plan, and billingCycle are required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const subscription = await upsertSubscription(
      tenantId,
      plan,
      billingCycle,
      stripeSubscriptionId
    )

    return res.status(200).json(subscription)
  } catch (error) {
    logger.error('Error upserting subscription', error)
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upsert subscription',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get subscription
 */
export async function getSubscriptionRoute(req: Request, res: Response) {
  try {
    const tenantId = res.locals.tenantId || req.params.tenantId || req.query.tenantId as string

    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const subscription = await getSubscription(tenantId)

    if (!subscription) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Subscription for tenant ${tenantId} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    return res.status(200).json(subscription)
  } catch (error) {
    logger.error('Error getting subscription', error)
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get subscription',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscriptionRoute(req: Request, res: Response) {
  try {
    const { tenantId } = req.params
    const { cancelAtPeriodEnd } = req.body

    const subscription = await cancelSubscription(tenantId, cancelAtPeriodEnd !== false)

    return res.status(200).json(subscription)
  } catch (error: any) {
    logger.error('Error cancelling subscription', error)
    if (error.message === 'Subscription not found') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to cancel subscription',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}
