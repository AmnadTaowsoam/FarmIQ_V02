import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export interface ThresholdRuleInput {
  tenantId: string
  farmId?: string | null
  barnId?: string | null
  metric: string
  op: string
  value: number
  durationSec?: number | null
  severity?: string
  enabled?: boolean
}

export interface TargetCurveInput {
  tenantId: string
  farmId?: string | null
  barnId?: string | null
  species?: string | null
  day: number
  targetWeight?: number | null
  targetFcr?: number | null
}

/**
 * Get effective config for context (tenant/farm/barn)
 * Returns most specific config available
 */
export async function getEffectiveConfig(
  tenantId: string,
  farmId?: string,
  barnId?: string
) {
  try {
    // Get thresholds (most specific first)
    let thresholds = await prisma.thresholdRule.findMany({
      where: {
        tenantId,
        enabled: true,
        ...(barnId ? { barnId } : farmId ? { farmId, barnId: null } : { farmId: null, barnId: null }),
      },
      orderBy: [
        { barnId: 'desc' },
        { farmId: 'desc' },
      ],
    })

    // Get target curves
    const targetCurves = await prisma.targetCurve.findMany({
      where: {
        tenantId,
        ...(barnId ? { barnId } : farmId ? { farmId, barnId: null } : { farmId: null, barnId: null }),
      },
      orderBy: { day: 'asc' },
    })

    return {
      thresholds,
      targetCurves,
    }
  } catch (error) {
    logger.error('Error getting effective config', error)
    throw error
  }
}

/**
 * Get thresholds for context
 */
export async function getThresholds(
  tenantId: string,
  farmId?: string,
  barnId?: string
) {
  try {
    const where: any = {
      tenantId,
      ...(farmId ? { farmId } : { farmId: null }),
      ...(barnId ? { barnId } : { barnId: null }),
    }

    return await prisma.thresholdRule.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })
  } catch (error) {
    logger.error('Error getting thresholds', error)
    throw error
  }
}

/**
 * Upsert threshold rule
 */
export async function upsertThreshold(
  input: ThresholdRuleInput,
  updatedBy: string
) {
  try {
    // Find existing rule with same context
    const existing = await prisma.thresholdRule.findFirst({
      where: {
        tenantId: input.tenantId,
        farmId: input.farmId || null,
        barnId: input.barnId || null,
        metric: input.metric,
        op: input.op,
      },
    })

    if (existing) {
      return await prisma.thresholdRule.update({
        where: { id: existing.id },
        data: {
          value: input.value,
          durationSec: input.durationSec,
          severity: input.severity || 'warning',
          enabled: input.enabled !== undefined ? input.enabled : true,
          updatedBy,
        },
      })
    }

    return await prisma.thresholdRule.create({
      data: {
        ...input,
        severity: input.severity || 'warning',
        enabled: input.enabled !== undefined ? input.enabled : true,
        updatedBy,
        farmId: input.farmId || null,
        barnId: input.barnId || null,
        durationSec: input.durationSec || null,
      },
    })
  } catch (error) {
    logger.error('Error upserting threshold', error)
    throw error
  }
}

/**
 * Get target curves for context
 */
export async function getTargets(
  tenantId: string,
  farmId?: string,
  barnId?: string,
  species?: string
) {
  try {
    const where: any = {
      tenantId,
      ...(farmId ? { farmId } : { farmId: null }),
      ...(barnId ? { barnId } : { barnId: null }),
      ...(species ? { species } : { species: null }),
    }

    return await prisma.targetCurve.findMany({
      where,
      orderBy: { day: 'asc' },
    })
  } catch (error) {
    logger.error('Error getting targets', error)
    throw error
  }
}

/**
 * Upsert target curve entry
 */
export async function upsertTarget(
  input: TargetCurveInput,
  updatedBy: string
) {
  try {
    // Find existing entry
    const existing = await prisma.targetCurve.findFirst({
      where: {
        tenantId: input.tenantId,
        farmId: input.farmId || null,
        barnId: input.barnId || null,
        species: input.species || null,
        day: input.day,
      },
    })

    if (existing) {
      return await prisma.targetCurve.update({
        where: { id: existing.id },
        data: {
          targetWeight: input.targetWeight !== undefined ? input.targetWeight : undefined,
          targetFcr: input.targetFcr !== undefined ? input.targetFcr : undefined,
          updatedBy,
        },
      })
    }

    return await prisma.targetCurve.create({
      data: {
        tenantId: input.tenantId,
        farmId: input.farmId || null,
        barnId: input.barnId || null,
        species: input.species || null,
        day: input.day,
        targetWeight: input.targetWeight || null,
        targetFcr: input.targetFcr || null,
        updatedBy,
      },
    })
  } catch (error) {
    logger.error('Error upserting target', error)
    throw error
  }
}

