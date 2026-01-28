import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'
import { aggregateUsageMetrics } from './usageMeteringService'

const prisma = new PrismaClient()

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

/**
 * Generate invoice number
 */
function generateInvoiceNumber(tenantId: string, periodStart: Date): string {
  const year = periodStart.getFullYear()
  const month = String(periodStart.getMonth() + 1).padStart(2, '0')
  const tenantShort = tenantId.substring(0, 8).toUpperCase()
  return `INV-${year}${month}-${tenantShort}-${Date.now().toString(36).toUpperCase()}`
}

/**
 * Calculate invoice amount from usage metrics
 */
async function calculateInvoiceAmount(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{ amount: number; lineItems: LineItem[] }> {
  const usage = await aggregateUsageMetrics(tenantId, periodStart, periodEnd)

  const lineItems: LineItem[] = []
  let totalAmount = 0

  // Pricing tiers (can be moved to config)
  const pricing: Record<string, { unitPrice: number; unit: string }> = {
    devices: { unitPrice: 10, unit: 'device' },
    api_calls: { unitPrice: 0.001, unit: 'call' },
    storage_gb: { unitPrice: 0.5, unit: 'GB' },
    telemetry_points: { unitPrice: 0.0001, unit: 'point' },
  }

  for (const [metricType, value] of Object.entries(usage)) {
    const price = pricing[metricType]
    if (price) {
      const amount = value * price.unitPrice
      lineItems.push({
        description: `${metricType} (${value} ${price.unit})`,
        quantity: value,
        unitPrice: price.unitPrice,
        amount,
      })
      totalAmount += amount
    }
  }

  return { amount: totalAmount, lineItems }
}

/**
 * Create invoice
 */
export async function createInvoice(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date,
  dueDate?: Date
) {
  try {
    const { amount, lineItems } = await calculateInvoiceAmount(
      tenantId,
      periodStart,
      periodEnd
    )

    const invoiceNumber = generateInvoiceNumber(tenantId, periodStart)

    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        invoiceNumber,
        amount: new Prisma.Decimal(amount),
        currency: 'USD',
        status: 'draft',
        dueDate: dueDate || new Date(periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days after period end
        periodStart,
        periodEnd,
        lineItems: lineItems as any,
      },
    })

    logger.info('Invoice created', { invoiceId: invoice.id, invoiceNumber, tenantId })
    return invoice
  } catch (error) {
    logger.error('Error creating invoice', error)
    throw error
  }
}

/**
 * Get invoices for tenant
 */
export async function getInvoices(
  tenantId: string,
  status?: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const where: Prisma.InvoiceWhereInput = { tenantId }
    if (status) where.status = status
    if (startDate || endDate) {
      where.periodStart = {}
      if (startDate) where.periodStart.gte = startDate
      if (endDate) where.periodStart.lte = endDate
    }

    return await prisma.invoice.findMany({
      where,
      include: {
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    logger.error('Error getting invoices', error)
    throw error
  }
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(invoiceId: string) {
  try {
    return await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
      },
    })
  } catch (error) {
    logger.error('Error getting invoice', error)
    throw error
  }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
) {
  try {
    const updateData: any = { status }
    if (status === 'paid') {
      updateData.paidAt = new Date()
    }

    return await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
    })
  } catch (error) {
    logger.error('Error updating invoice status', error)
    throw error
  }
}
