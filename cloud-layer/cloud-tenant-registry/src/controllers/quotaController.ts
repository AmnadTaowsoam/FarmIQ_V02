import { Request, Response } from 'express';
import {
  getTenantQuota,
  updateTenantQuota,
  checkTenantQuota,
  getTenantRateLimits,
  upsertTenantRateLimit,
  deleteTenantRateLimit,
} from '../services/quotaService';
import { logger } from '../utils/logger';

/**
 * Get tenant quota
 */
export async function getTenantQuotaRoute(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;

    const quota = await getTenantQuota(tenantId);

    return res.status(200).json(quota);
  } catch (error: any) {
    logger.error('Error getting tenant quota', error);
    if (error?.code === 'TENANT_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get tenant quota',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Update tenant quota
 */
export async function updateTenantQuotaRoute(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { maxDevices, maxFarms, maxBarns, maxUsers, maxStorageGb, maxApiCallsPerDay } = req.body;

    const quota = await updateTenantQuota(tenantId, {
      maxDevices,
      maxFarms,
      maxBarns,
      maxUsers,
      maxStorageGb,
      maxApiCallsPerDay,
    });

    return res.status(200).json(quota);
  } catch (error: any) {
    logger.error('Error updating tenant quota', error);
    if (error?.code === 'TENANT_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update tenant quota',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Check tenant quota
 */
export async function checkTenantQuotaRoute(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { resourceType, currentCount } = req.query;

    if (!resourceType) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'resourceType is required',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    const result = await checkTenantQuota(
      tenantId,
      resourceType as any,
      currentCount ? parseInt(currentCount as string, 10) : undefined
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error checking tenant quota', error);
    if (error?.code === 'TENANT_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check tenant quota',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Get tenant rate limits
 */
export async function getTenantRateLimitsRoute(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { endpoint } = req.query;

    const rateLimits = await getTenantRateLimits(tenantId, endpoint as string | undefined);

    return res.status(200).json({
      data: rateLimits,
      total: rateLimits.length,
    });
  } catch (error) {
    logger.error('Error getting tenant rate limits', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get tenant rate limits',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Create or update tenant rate limit
 */
export async function upsertTenantRateLimitRoute(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { endpoint, requestsPerMinute, requestsPerHour, requestsPerDay } = req.body;

    if (!requestsPerMinute || !requestsPerHour || !requestsPerDay) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'requestsPerMinute, requestsPerHour, and requestsPerDay are required',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    const rateLimit = await upsertTenantRateLimit(tenantId, endpoint || null, {
      requestsPerMinute,
      requestsPerHour,
      requestsPerDay,
    });

    return res.status(200).json(rateLimit);
  } catch (error) {
    logger.error('Error upserting tenant rate limit', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upsert tenant rate limit',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Delete tenant rate limit
 */
export async function deleteTenantRateLimitRoute(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { endpoint } = req.query;

    await deleteTenantRateLimit(tenantId, (endpoint as string) || null);

    return res.status(204).send();
  } catch (error: any) {
    logger.error('Error deleting tenant rate limit', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Rate limit not found',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete tenant rate limit',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}
