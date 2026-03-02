import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const DEFAULT_TENANT_QUOTA = {
  maxDevices: 100,
  maxFarms: 10,
  maxBarns: 50,
  maxUsers: 20,
  maxStorageGb: 100,
  maxApiCallsPerDay: 10000,
} as const;

function tenantNotFoundError(tenantId: string) {
  const err = new Error(`Tenant with id ${tenantId} not found`) as Error & { code?: string };
  err.code = 'TENANT_NOT_FOUND';
  return err;
}

async function assertTenantExists(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!tenant) {
    throw tenantNotFoundError(tenantId);
  }
}

/**
 * Get tenant quota
 */
export async function getTenantQuota(tenantId: string) {
  try {
    await assertTenantExists(tenantId);

    let quota = await prisma.tenantQuota.findUnique({
      where: { tenantId },
    });

    // Create default quota if doesn't exist
    if (!quota) {
      quota = await prisma.tenantQuota.create({
        data: {
          tenantId,
          ...DEFAULT_TENANT_QUOTA,
        },
      });
    }

    return quota;
  } catch (error) {
    logger.error('Error getting tenant quota', error);
    throw error;
  }
}

/**
 * Update tenant quota
 */
export async function updateTenantQuota(
  tenantId: string,
  quota: {
    maxDevices?: number | null;
    maxFarms?: number | null;
    maxBarns?: number | null;
    maxUsers?: number | null;
    maxStorageGb?: number | null;
    maxApiCallsPerDay?: number | null;
  }
) {
  try {
    await assertTenantExists(tenantId);

    return await prisma.tenantQuota.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...quota,
      },
      update: quota,
    });
  } catch (error) {
    logger.error('Error updating tenant quota', error);
    throw error;
  }
}

/**
 * Check if tenant has exceeded quota
 */
export async function checkTenantQuota(
  tenantId: string,
  resourceType: 'devices' | 'farms' | 'barns' | 'users' | 'storage' | 'api_calls',
  currentCount?: number
): Promise<{ allowed: boolean; quota?: number; current?: number }> {
  try {
    const quota = await getTenantQuota(tenantId);

    let quotaLimit: number | null = null;
    let current: number | undefined = currentCount;

    switch (resourceType) {
      case 'devices':
        quotaLimit = quota.maxDevices;
        if (current === undefined) {
          current = await prisma.device.count({ where: { tenantId } });
        }
        break;
      case 'farms':
        quotaLimit = quota.maxFarms;
        if (current === undefined) {
          current = await prisma.farm.count({ where: { tenantId } });
        }
        break;
      case 'barns':
        quotaLimit = quota.maxBarns;
        if (current === undefined) {
          current = await prisma.barn.count({ where: { tenantId } });
        }
        break;
      case 'users':
        // Users are in identity-access service, so we can't count them here
        quotaLimit = quota.maxUsers;
        break;
      case 'storage':
        // Storage would need to be calculated from telemetry/analytics
        quotaLimit = quota.maxStorageGb;
        break;
      case 'api_calls':
        // API calls would be tracked separately
        quotaLimit = quota.maxApiCallsPerDay;
        break;
    }

    if (quotaLimit === null) {
      return { allowed: true }; // No quota limit set
    }

    if (current === undefined) {
      return { allowed: true, quota: quotaLimit }; // Can't determine current, allow
    }

    return {
      allowed: current < quotaLimit,
      quota: quotaLimit,
      current,
    };
  } catch (error) {
    if ((error as any)?.code === 'TENANT_NOT_FOUND') {
      throw error;
    }
    logger.error('Error checking tenant quota', error);
    // On error, allow the operation (fail open)
    return { allowed: true };
  }
}

/**
 * Get tenant rate limits
 */
export async function getTenantRateLimits(tenantId: string, endpoint?: string) {
  try {
    const where: any = { tenantId };
    if (endpoint) {
      where.endpoint = endpoint;
    }

    return await prisma.tenantRateLimit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    logger.error('Error getting tenant rate limits', error);
    throw error;
  }
}

/**
 * Create or update tenant rate limit
 */
export async function upsertTenantRateLimit(
  tenantId: string,
  endpoint: string | null,
  limits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  }
) {
  try {
    return await prisma.tenantRateLimit.upsert({
      where: {
        tenantId_endpoint: {
          tenantId,
          endpoint: endpoint ?? (null as any), // Prisma supports null in unique constraints
        },
      },
      create: {
        tenantId,
        endpoint: endpoint ?? null,
        ...limits,
      },
      update: limits,
    });
  } catch (error) {
    logger.error('Error upserting tenant rate limit', error);
    throw error;
  }
}

/**
 * Delete tenant rate limit
 */
export async function deleteTenantRateLimit(tenantId: string, endpoint: string | null) {
  try {
    await prisma.tenantRateLimit.delete({
      where: {
        tenantId_endpoint: {
          tenantId,
          endpoint: endpoint ?? (null as any), // Prisma supports null in unique constraints
        },
      },
    });
    return true;
  } catch (error) {
    logger.error('Error deleting tenant rate limit', error);
    throw error;
  }
}
