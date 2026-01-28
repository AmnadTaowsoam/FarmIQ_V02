import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null

/**
 * Create or update subscription
 */
export async function upsertSubscription(
  tenantId: string,
  plan: string,
  billingCycle: 'monthly' | 'annual',
  stripeSubscriptionId?: string
) {
  try {
    const now = new Date()
    const periodEnd = new Date(now)
    if (billingCycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    }

    return await prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan,
        billingCycle,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        stripeSubscriptionId,
      },
      update: {
        plan,
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        stripeSubscriptionId,
      },
    })
  } catch (error) {
    logger.error('Error upserting subscription', error)
    throw error
  }
}

/**
 * Get subscription for tenant
 */
export async function getSubscription(tenantId: string) {
  try {
    return await prisma.subscription.findUnique({
      where: { tenantId },
    })
  } catch (error) {
    logger.error('Error getting subscription', error)
    throw error
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  tenantId: string,
  cancelAtPeriodEnd: boolean = true
) {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
    })

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    // Cancel in Stripe if configured
    if (stripe && subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      })
    }

    return await prisma.subscription.update({
      where: { tenantId },
      data: {
        cancelAtPeriodEnd: cancelAtPeriodEnd,
        status: cancelAtPeriodEnd ? 'active' : 'cancelled',
      },
    })
  } catch (error) {
    logger.error('Error cancelling subscription', error)
    throw error
  }
}
