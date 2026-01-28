import { Request, Response } from 'express'
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
} from '../services/invoiceService'
import { logger } from '../utils/logger'

/**
 * Create invoice
 */
export async function createInvoiceRoute(req: Request, res: Response) {
  try {
    const { tenantId, periodStart, periodEnd, dueDate } = req.body

    if (!tenantId || !periodStart || !periodEnd) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId, periodStart, and periodEnd are required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const invoice = await createInvoice(
      tenantId,
      new Date(periodStart),
      new Date(periodEnd),
      dueDate ? new Date(dueDate) : undefined
    )

    return res.status(201).json(invoice)
  } catch (error) {
    logger.error('Error creating invoice', error)
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create invoice',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get invoices
 */
export async function getInvoicesRoute(req: Request, res: Response) {
  try {
    const tenantId = res.locals.tenantId || req.query.tenantId as string
    const { status, startDate, endDate } = req.query

    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const invoices = await getInvoices(
      tenantId,
      status as string | undefined,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    )

    return res.status(200).json({
      data: invoices,
      total: invoices.length,
    })
  } catch (error) {
    logger.error('Error getting invoices', error)
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get invoices',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get invoice by ID
 */
export async function getInvoiceByIdRoute(req: Request, res: Response) {
  try {
    const { id } = req.params

    const invoice = await getInvoiceById(id)

    if (!invoice) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Invoice with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    return res.status(200).json(invoice)
  } catch (error) {
    logger.error('Error getting invoice', error)
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get invoice',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatusRoute(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'status is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const invoice = await updateInvoiceStatus(id, status)

    return res.status(200).json(invoice)
  } catch (error: any) {
    logger.error('Error updating invoice status', error)
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Invoice with id ${req.params.id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update invoice status',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}
