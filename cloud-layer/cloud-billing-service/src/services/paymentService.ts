import { PrismaClient, Prisma } from '@prisma/client'
import Stripe from 'stripe'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null

/**
 * Create payment
 */
export async function createPayment(
  invoiceId: string,
  amount: number,
  currency: string,
  paymentMethod: string,
  externalId?: string
) {
  try {
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount: new Prisma.Decimal(amount),
        currency,
        paymentMethod,
        status: 'pending',
        externalId,
      },
    })

    logger.info('Payment created', { paymentId: payment.id, invoiceId })
    return payment
  } catch (error) {
    logger.error('Error creating payment', error)
    throw error
  }
}

/**
 * Process Stripe payment
 */
export async function processStripePayment(
  invoiceId: string,
  paymentIntentId: string
) {
  try {
    if (!stripe) {
      throw new Error('Stripe not configured')
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    const payment = await createPayment(
      invoiceId,
      paymentIntent.amount / 100, // Convert from cents
      paymentIntent.currency,
      'stripe',
      paymentIntentId
    )

    if (paymentIntent.status === 'succeeded') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      })

      // Update invoice status
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'paid',
          paidAt: new Date(),
        },
      })
    }

    return payment
  } catch (error) {
    logger.error('Error processing Stripe payment', error)
    throw error
  }
}

/**
 * Get payments for invoice
 */
export async function getPayments(invoiceId: string) {
  try {
    return await prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    logger.error('Error getting payments', error)
    throw error
  }
}
