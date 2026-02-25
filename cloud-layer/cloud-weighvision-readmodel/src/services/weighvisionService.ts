import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

/**
 * Get weighvision sessions with filters
 */
export async function getSessions(params: {
  tenantId: string
  farmId?: string
  barnId?: string
  batchId?: string
  stationId?: string
  status?: string
  from?: Date
  to?: Date
  limit?: number
  cursor?: string
}) {
  const {
    tenantId,
    farmId,
    barnId,
    batchId,
    stationId,
    status,
    from,
    to,
    limit = 100,
    cursor,
  } = params

  // Use raw SQL query since Prisma client may not recognize manually created tables
  let query = `
    SELECT 
      s.*,
      (
        SELECT COALESCE(
          (
            SELECT (m_final_meta."metaJson"::jsonb ->> 'image_count')::int
            FROM weighvision_measurement m_final_meta
            WHERE m_final_meta."sessionDbId" = s.id
              AND m_final_meta.source = 'finalized'
              AND m_final_meta."metaJson" IS NOT NULL
            ORDER BY m_final_meta.ts DESC
            LIMIT 1
          ),
          (
            SELECT COUNT(*)::int
            FROM weighvision_media med_count
            WHERE med_count."sessionDbId" = s.id
          ),
          0
        )
      ) as image_count,
      (
        SELECT COALESCE(
          (
            SELECT m_final."weightKg"
            FROM weighvision_measurement m_final
            WHERE m_final."sessionDbId" = s.id
              AND m_final.source = 'finalized'
            ORDER BY m_final.ts DESC
            LIMIT 1
          ),
          (
            SELECT m_last."weightKg"
            FROM weighvision_measurement m_last
            WHERE m_last."sessionDbId" = s.id
            ORDER BY m_last.ts DESC
            LIMIT 1
          )
        )
      ) as final_weight_kg,
      COALESCE(
        (SELECT json_agg(m ORDER BY m.ts DESC) 
         FROM (SELECT * FROM weighvision_measurement WHERE "sessionDbId" = s.id ORDER BY ts DESC LIMIT 10) m),
        '[]'::json
      ) as measurements,
      COALESCE(
        (SELECT json_agg(med ORDER BY med.ts DESC)
         FROM (SELECT * FROM weighvision_media WHERE "sessionDbId" = s.id ORDER BY ts DESC LIMIT 5) med),
        '[]'::json
      ) as media,
      COALESCE(
        (SELECT json_agg(inf ORDER BY inf.ts DESC)
         FROM (SELECT * FROM weighvision_inference WHERE "sessionDbId" = s.id ORDER BY ts DESC LIMIT 5) inf),
        '[]'::json
      ) as inferences
    FROM weighvision_session s
    WHERE s."tenantId" = $1
  `
  
  const queryParams: any[] = [tenantId]
  let paramIndex = 2
  
  if (farmId) {
    query += ` AND s."farmId" = $${paramIndex}`
    queryParams.push(farmId)
    paramIndex++
  }
  if (barnId) {
    query += ` AND s."barnId" = $${paramIndex}`
    queryParams.push(barnId)
    paramIndex++
  }
  if (batchId) {
    query += ` AND s."batchId" = $${paramIndex}`
    queryParams.push(batchId)
    paramIndex++
  }
  if (stationId) {
    query += ` AND s."stationId" = $${paramIndex}`
    queryParams.push(stationId)
    paramIndex++
  }
  if (status) {
    query += ` AND s.status = $${paramIndex}`
    queryParams.push(status)
    paramIndex++
  }
  if (from) {
    query += ` AND s."startedAt" >= $${paramIndex}`
    queryParams.push(from)
    paramIndex++
  }
  if (to) {
    query += ` AND s."startedAt" <= $${paramIndex}`
    queryParams.push(to)
    paramIndex++
  }
  if (cursor) {
    query += ` AND s.id > $${paramIndex}`
    queryParams.push(cursor)
    paramIndex++
  }
  
  query += ` ORDER BY s."startedAt" DESC LIMIT $${paramIndex}`
  queryParams.push(limit + 1)
  
  // Use Prisma.sql for type safety, but cast to any for dynamic queries
  const sessionsRaw = await prisma.$queryRawUnsafe(query, ...queryParams) as any[]
  
  // Transform raw results
  const sessions = sessionsRaw.map((row: any) => ({
    id: row.id,
    tenantId: row.tenantId,
    farmId: row.farmId,
    barnId: row.barnId,
    batchId: row.batchId,
    stationId: row.stationId,
    sessionId: row.sessionId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    status: row.status,
    image_count: row.image_count ?? 0,
    final_weight_kg: row.final_weight_kg != null ? Number(row.final_weight_kg) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    measurements: row.measurements || [],
    media: row.media || [],
    inferences: row.inferences || [],
  }))

  const hasNext = sessions.length > limit
  const items = hasNext ? sessions.slice(0, limit) : sessions
  const nextCursor = hasNext ? items[items.length - 1].id : null

  return {
    items,
    nextCursor,
    hasMore: hasNext,
  }
}

/**
 * Get weighvision session by ID
 */
export async function getSessionById(tenantId: string, sessionId: string) {
  // Use raw SQL query since Prisma client may not recognize manually created tables
  const query = `
    SELECT 
      s.*,
      COALESCE(
        (SELECT json_agg(m ORDER BY m.ts ASC)
         FROM weighvision_measurement m
         WHERE m."sessionDbId" = s.id),
        '[]'::json
      ) as measurements,
      COALESCE(
        (SELECT json_agg(med ORDER BY med.ts ASC)
         FROM weighvision_media med
         WHERE med."sessionDbId" = s.id),
        '[]'::json
      ) as media,
      COALESCE(
        (SELECT json_agg(inf ORDER BY inf.ts ASC)
         FROM weighvision_inference inf
         WHERE inf."sessionDbId" = s.id),
        '[]'::json
      ) as inferences
    FROM weighvision_session s
    WHERE s."tenantId" = $1 AND s."sessionId" = $2
    LIMIT 1
  `
  
  const results = await prisma.$queryRawUnsafe(query, tenantId, sessionId) as any[]
  
  if (results.length === 0) {
    return null
  }
  
  const row = results[0]
  return {
    id: row.id,
    tenantId: row.tenantId,
    farmId: row.farmId,
    barnId: row.barnId,
    batchId: row.batchId,
    stationId: row.stationId,
    sessionId: row.sessionId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    measurements: Array.isArray(row.measurements) ? row.measurements : [],
    media: Array.isArray(row.media) ? row.media : [],
    inferences: Array.isArray(row.inferences) ? row.inferences : [],
  }
}

/**
 * RabbitMQ event envelope
 */
export interface WeighVisionEvent {
  event_id: string
  event_type: string
  tenant_id: string
  farm_id?: string
  barn_id?: string
  batch_id?: string
  station_id?: string
  session_id?: string
  occurred_at: string
  trace_id?: string
  payload: Record<string, unknown>
}

/**
 * Handle weighvision.session.created event
 */
export async function handleSessionCreated(event: WeighVisionEvent) {
  try {
    // Check deduplication
    const existing = await prisma.weighVisionEventDedupe.findUnique({
      where: {
        tenantId_eventId: {
          tenantId: event.tenant_id,
          eventId: event.event_id,
        },
      },
    })

    if (existing) {
      logger.debug('Duplicate weighvision session.created event ignored', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create dedupe record first
    await prisma.weighVisionEventDedupe.create({
      data: {
        id: event.event_id, // Use event_id as id for simplicity
        tenantId: event.tenant_id,
        eventId: event.event_id,
        eventType: event.event_type,
      },
    })

    // Create session
    const sessionId = event.session_id || event.payload.session_id as string
    if (!sessionId) {
      logger.warn('Missing session_id in weighvision.session.created event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    await prisma.weighVisionSession.upsert({
      where: {
        tenantId_sessionId: {
          tenantId: event.tenant_id,
          sessionId,
        },
      },
      create: {
        id: event.event_id, // Use event_id as id
        tenantId: event.tenant_id,
        farmId: event.farm_id || null,
        barnId: event.barn_id || null,
        batchId: event.batch_id || (event.payload.batch_id as string) || null,
        stationId: event.station_id || (event.payload.station_id as string) || null,
        sessionId,
        startedAt: new Date(event.occurred_at),
        status: 'RUNNING',
      },
      update: {
        // Update if exists (shouldn't happen, but safe)
        status: 'RUNNING',
        updatedAt: new Date(),
      },
    })

    logger.info('WeighVision session created', {
      eventId: event.event_id,
      tenantId: event.tenant_id,
      sessionId,
      traceId: event.trace_id,
    })

    return true
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Duplicate - already processed
      logger.debug('Duplicate weighvision session (unique constraint)', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }
    logger.error('Error handling weighvision.session.created', {
      error,
      eventId: event.event_id,
      tenantId: event.tenant_id,
    })
    throw error
  }
}

/**
 * Handle weighvision.session.finalized event
 */
export async function handleSessionFinalized(event: WeighVisionEvent) {
  try {
    // Check deduplication
    const existing = await prisma.weighVisionEventDedupe.findUnique({
      where: {
        tenantId_eventId: {
          tenantId: event.tenant_id,
          eventId: event.event_id,
        },
      },
    })

    if (existing) {
      logger.debug('Duplicate weighvision session.finalized event ignored', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create dedupe record
    await prisma.weighVisionEventDedupe.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        eventId: event.event_id,
        eventType: event.event_type,
      },
    })

    const sessionId = event.session_id || event.payload.session_id as string
    if (!sessionId) {
      logger.warn('Missing session_id in weighvision.session.finalized event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    const finalWeightRaw = (event.payload.final_weight_kg ?? event.payload.finalWeightKg) as unknown
    const imageCountRaw = (event.payload.image_count ?? event.payload.imageCount) as unknown
    const finalWeightKg =
      typeof finalWeightRaw === 'number'
        ? finalWeightRaw
        : typeof finalWeightRaw === 'string'
          ? Number(finalWeightRaw)
          : NaN
    const imageCount =
      typeof imageCountRaw === 'number'
        ? imageCountRaw
        : typeof imageCountRaw === 'string'
          ? Number(imageCountRaw)
          : NaN

    // Update session
    const session = await prisma.weighVisionSession.update({
      where: {
        tenantId_sessionId: {
          tenantId: event.tenant_id,
          sessionId,
        },
      },
      data: {
        status: 'FINALIZED',
        endedAt: new Date(event.occurred_at),
        updatedAt: new Date(),
      },
    })

    if (Number.isFinite(finalWeightKg)) {
      const finalizedMeta: Record<string, unknown> = { source_event: 'weighvision.session.finalized' }
      if (Number.isFinite(imageCount) && imageCount >= 0) {
        finalizedMeta.image_count = Math.trunc(imageCount)
      }

      await prisma.weighVisionMeasurement.create({
        data: {
          id: `${event.event_id}:finalized`,
          tenantId: event.tenant_id,
          sessionId,
          sessionDbId: session.id,
          ts: new Date(event.occurred_at),
          weightKg: finalWeightKg,
          source: 'finalized',
          metaJson: JSON.stringify(finalizedMeta),
        },
      })
    }

    logger.info('WeighVision session finalized', {
      eventId: event.event_id,
      tenantId: event.tenant_id,
      sessionId,
      traceId: event.trace_id,
    })

    return true
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Session not found - log warning but don't fail
      logger.warn('WeighVision session not found for finalized event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
        sessionId: event.session_id,
      })
      return false
    }
    logger.error('Error handling weighvision.session.finalized', {
      error,
      eventId: event.event_id,
      tenantId: event.tenant_id,
    })
    throw error
  }
}

/**
 * Handle weight.recorded event (if exists)
 */
export async function handleWeightRecorded(event: WeighVisionEvent) {
  try {
    // Check deduplication
    const existing = await prisma.weighVisionEventDedupe.findUnique({
      where: {
        tenantId_eventId: {
          tenantId: event.tenant_id,
          eventId: event.event_id,
        },
      },
    })

    if (existing) {
      logger.debug('Duplicate weight.recorded event ignored', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create dedupe record
    await prisma.weighVisionEventDedupe.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        eventId: event.event_id,
        eventType: event.event_type,
      },
    })

    const sessionId = event.session_id || event.payload.session_id as string
    if (!sessionId) {
      logger.warn('Missing session_id in weight.recorded event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Find session by external sessionId to get internal DB ID
    const session = await prisma.weighVisionSession.findUnique({
      where: {
        tenantId_sessionId: {
          tenantId: event.tenant_id,
          sessionId: sessionId,
        },
      },
    })

    if (!session) {
      logger.warn('Session not found for weight.recorded event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
        sessionId,
      })
      return false
    }

    const weightKg = event.payload.weight_kg as number || event.payload.weightKg as number
    if (!weightKg) {
      logger.warn('Missing weight_kg in weight.recorded event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create measurement
    await prisma.weighVisionMeasurement.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        sessionId, // Keep external sessionId for querying
        sessionDbId: session.id, // Use internal DB ID for relation
        ts: new Date(event.occurred_at),
        weightKg,
        source: (event.payload.source as string) || 'scale',
        metaJson: event.payload.meta ? JSON.stringify(event.payload.meta) : null,
      },
    })

    logger.info('WeighVision measurement recorded', {
      eventId: event.event_id,
      tenantId: event.tenant_id,
      sessionId,
      weightKg,
      traceId: event.trace_id,
    })

    return true
  } catch (error: any) {
    if (error.code === 'P2002') {
      logger.debug('Duplicate weight measurement (unique constraint)', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }
    logger.error('Error handling weight.recorded', {
      error,
      eventId: event.event_id,
      tenantId: event.tenant_id,
    })
    throw error
  }
}

/**
 * Handle media.stored event (optional)
 */
export async function handleMediaStored(event: WeighVisionEvent) {
  try {
    // Check deduplication
    const existing = await prisma.weighVisionEventDedupe.findUnique({
      where: {
        tenantId_eventId: {
          tenantId: event.tenant_id,
          eventId: event.event_id,
        },
      },
    })

    if (existing) {
      logger.debug('Duplicate media.stored event ignored', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create dedupe record
    await prisma.weighVisionEventDedupe.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        eventId: event.event_id,
        eventType: event.event_type,
      },
    })

    const sessionId = event.session_id || event.payload.session_id as string
    if (!sessionId) {
      logger.warn('Missing session_id in media.stored event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Find session by external sessionId to get internal DB ID
    const session = await prisma.weighVisionSession.findUnique({
      where: {
        tenantId_sessionId: {
          tenantId: event.tenant_id,
          sessionId: sessionId,
        },
      },
    })

    if (!session) {
      logger.warn('Session not found for media.stored event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
        sessionId,
      })
      return false
    }

    const objectId =
      event.payload.object_id as string ||
      event.payload.objectId as string ||
      event.payload.media_id as string ||
      event.payload.mediaId as string
    const path =
      event.payload.path as string ||
      event.payload.url as string ||
      event.payload.object_key as string ||
      event.payload.objectKey as string
    if (!objectId || !path) {
      logger.warn('Missing object_id or path in media.stored event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create media record
    await prisma.weighVisionMedia.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        sessionId, // Keep external sessionId for querying
        sessionDbId: session.id, // Use internal DB ID for relation
        objectId,
        path,
        ts: new Date(event.occurred_at),
      },
    })

    logger.info('WeighVision media stored', {
      eventId: event.event_id,
      tenantId: event.tenant_id,
      sessionId,
      objectId,
      traceId: event.trace_id,
    })

    return true
  } catch (error: any) {
    if (error.code === 'P2002') {
      logger.debug('Duplicate media record (unique constraint)', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }
    logger.error('Error handling media.stored', {
      error,
      eventId: event.event_id,
      tenantId: event.tenant_id,
    })
    throw error
  }
}

/**
 * Get weighvision analytics (trends, distributions, statistics)
 */
export async function getAnalytics(params: {
  tenantId: string
  farmId?: string
  barnId?: string
  batchId?: string
  startDate: Date
  endDate: Date
  aggregation?: 'daily' | 'weekly' | 'monthly'
}) {
  const {
    tenantId,
    farmId,
    barnId,
    batchId,
    startDate,
    endDate,
    aggregation = 'daily',
  } = params

  const where: any = {
    tenantId,
    status: 'FINALIZED',
    startedAt: {
      gte: startDate,
      lte: endDate,
    },
  }

  if (farmId) where.farmId = farmId
  if (barnId) where.barnId = barnId
  if (batchId) where.batchId = batchId

  // Get all finalized sessions with measurements using raw SQL (Prisma client may not recognize manually created tables)
  let sessionsQuery = `
    SELECT 
      s.*,
      COALESCE(
        (SELECT json_agg(m ORDER BY m.ts ASC)
         FROM weighvision_measurement m
         WHERE m."sessionDbId" = s.id),
        '[]'::json
      ) as measurements
    FROM weighvision_session s
    WHERE s."tenantId" = $1
      AND s.status = 'FINALIZED'
      AND s."startedAt" >= $2
      AND s."startedAt" <= $3
  `
  
  const queryParams: any[] = [tenantId, startDate, endDate]
  let paramIndex = 4
  
  if (farmId) {
    sessionsQuery += ` AND s."farmId" = $${paramIndex}`
    queryParams.push(farmId)
    paramIndex++
  }
  if (barnId) {
    sessionsQuery += ` AND s."barnId" = $${paramIndex}`
    queryParams.push(barnId)
    paramIndex++
  }
  if (batchId) {
    sessionsQuery += ` AND s."batchId" = $${paramIndex}`
    queryParams.push(batchId)
    paramIndex++
  }
  
  sessionsQuery += ` ORDER BY s."startedAt" ASC`
  
  const sessionsRaw = await prisma.$queryRawUnsafe(sessionsQuery, ...queryParams) as any[]
  
  // Transform raw results to match expected format
  const sessions = sessionsRaw.map((row: any) => ({
    id: row.id,
    tenantId: row.tenantId,
    farmId: row.farmId,
    barnId: row.barnId,
    batchId: row.batchId,
    stationId: row.stationId,
    sessionId: row.sessionId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    measurements: Array.isArray(row.measurements) ? row.measurements : [],
  }))

  // Collect all weights
  const allWeights: number[] = []
  const weightByDate: Record<string, number[]> = {}

  for (const session of sessions) {
    for (const measurement of session.measurements) {
      const weight = Number(measurement.weightKg)
      if (isNaN(weight) || weight <= 0) continue

      allWeights.push(weight)

      // Group by date based on aggregation
      const date = new Date(measurement.ts)
      let dateKey: string

      if (aggregation === 'daily') {
        dateKey = date.toISOString().split('T')[0]
      } else if (aggregation === 'weekly') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        dateKey = weekStart.toISOString().split('T')[0]
      } else {
        // monthly
        const month = date.getMonth() + 1
        dateKey = `${date.getFullYear()}-${String(month).padStart(2, '0')}`
      }

      if (!weightByDate[dateKey]) {
        weightByDate[dateKey] = []
      }
      weightByDate[dateKey].push(weight)
    }
  }

  // Calculate statistics
  const calculateStats = (weights: number[]) => {
    if (weights.length === 0) return null

    const sorted = [...weights].sort((a, b) => a - b)
    const sum = weights.reduce((a, b) => a + b, 0)
    const avg = sum / weights.length
    const variance = weights.reduce((acc, w) => acc + Math.pow(w - avg, 2), 0) / weights.length
    const stddev = Math.sqrt(variance)
    const cv = avg > 0 ? stddev / avg : 0

    // Percentiles
    const p10 = sorted[Math.floor(sorted.length * 0.1)] || sorted[0]
    const p25 = sorted[Math.floor(sorted.length * 0.25)] || sorted[0]
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || sorted[0]
    const p75 = sorted[Math.floor(sorted.length * 0.75)] || sorted[sorted.length - 1]
    const p90 = sorted[Math.floor(sorted.length * 0.9)] || sorted[sorted.length - 1]

    // Uniformity: percentage within ±10% of average
    const withinRange = weights.filter(w => Math.abs(w - avg) / avg <= 0.1).length
    const uniformity = weights.length > 0 ? (withinRange / weights.length) * 100 : 0

    return {
      avg,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      stddev,
      cv,
      p10,
      p25,
      p50,
      p75,
      p90,
      uniformity,
      iqr: p75 - p25,
    }
  }

  const overallStats = calculateStats(allWeights)

  // Build weight trend
  const weightTrend = Object.entries(weightByDate)
    .map(([date, weights]) => {
      const stats = calculateStats(weights)
      if (!stats) return null

      return {
        date,
        avg_weight_kg: stats.avg,
        min_weight_kg: stats.min,
        max_weight_kg: stats.max,
        p10_weight_kg: stats.p10,
        p25_weight_kg: stats.p25,
        p50_weight_kg: stats.p50,
        p75_weight_kg: stats.p75,
        p90_weight_kg: stats.p90,
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a?.date || '').localeCompare(b?.date || ''))

  // Build distribution bins
  const bins: Array<{ range: string; count: number }> = []
  if (allWeights.length > 0) {
    const min = Math.min(...allWeights)
    const max = Math.max(...allWeights)
    const binCount = 10
    const binWidth = (max - min) / binCount

    for (let i = 0; i < binCount; i++) {
      const binMin = min + i * binWidth
      const binMax = min + (i + 1) * binWidth
      const count = allWeights.filter(w => w >= binMin && (i === binCount - 1 ? w <= binMax : w < binMax)).length

      bins.push({
        range: `${binMin.toFixed(1)}-${binMax.toFixed(1)}`,
        count,
      })
    }
  }

  return {
    weight_trend: weightTrend,
    statistics: overallStats
      ? {
          current_avg_weight_kg: overallStats.avg,
          current_stddev_kg: overallStats.stddev,
          uniformity_percent: overallStats.uniformity,
          cv: overallStats.cv,
          iqr_kg: overallStats.iqr,
        }
      : {
          current_avg_weight_kg: 0,
          current_stddev_kg: 0,
          uniformity_percent: 0,
          cv: 0,
          iqr_kg: 0,
        },
    distribution: {
      bins,
    },
  }
}

/**
 * Get weighvision weight aggregates (precomputed daily rollups)
 */
export async function listWeightAggregates(params: {
  tenantId: string
  farmId?: string
  barnId?: string
  batchId?: string
  startDate: Date
  endDate: Date
}) {
  const { tenantId, farmId, barnId, batchId, startDate, endDate } = params

  let query = `
    SELECT
      a.*
    FROM weighvision_weight_aggregate a
    WHERE a."tenantId" = $1
      AND a."recordDate" >= $2
      AND a."recordDate" <= $3
  `

  const queryParams: any[] = [tenantId, startDate, endDate]
  let paramIndex = 4

  if (farmId) {
    query += ` AND a."farmId" = $${paramIndex}`
    queryParams.push(farmId)
    paramIndex++
  }
  if (barnId) {
    query += ` AND a."barnId" = $${paramIndex}`
    queryParams.push(barnId)
    paramIndex++
  }
  if (batchId) {
    query += ` AND a."batchId" = $${paramIndex}`
    queryParams.push(batchId)
    paramIndex++
  }

  query += ` ORDER BY a."recordDate" ASC`

  const rows = (await prisma.$queryRawUnsafe(query, ...queryParams)) as any[]

  return rows.map((row: any) => ({
    id: row.id,
    tenantId: row.tenantId,
    farmId: row.farmId,
    barnId: row.barnId,
    batchId: row.batchId,
    recordDate: row.recordDate,
    avgWeightKg: row.avgWeightKg,
    p10WeightKg: row.p10WeightKg,
    p50WeightKg: row.p50WeightKg,
    p90WeightKg: row.p90WeightKg,
    sampleCount: row.sampleCount,
    qualityPassRate: row.qualityPassRate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))
}

/**
 * Handle inference.completed event (optional)
 */
export async function handleInferenceCompleted(event: WeighVisionEvent) {
  try {
    // Check deduplication
    const existing = await prisma.weighVisionEventDedupe.findUnique({
      where: {
        tenantId_eventId: {
          tenantId: event.tenant_id,
          eventId: event.event_id,
        },
      },
    })

    if (existing) {
      logger.debug('Duplicate inference.completed event ignored', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Create dedupe record
    await prisma.weighVisionEventDedupe.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        eventId: event.event_id,
        eventType: event.event_type,
      },
    })

    const sessionId = event.session_id || event.payload.session_id as string
    if (!sessionId) {
      logger.warn('Missing session_id in inference.completed event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }

    // Find session by external sessionId to get internal DB ID
    const session = await prisma.weighVisionSession.findUnique({
      where: {
        tenantId_sessionId: {
          tenantId: event.tenant_id,
          sessionId: sessionId,
        },
      },
    })

    if (!session) {
      logger.warn('Session not found for inference.completed event', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
        sessionId,
      })
      return false
    }

    const modelVersion = event.payload.model_version as string || event.payload.modelVersion as string || 'unknown'
    const resultJson = JSON.stringify(event.payload.result || event.payload)

    // Create inference record
    await prisma.weighVisionInference.create({
      data: {
        id: event.event_id,
        tenantId: event.tenant_id,
        sessionId, // Keep external sessionId for querying
        sessionDbId: session.id, // Use internal DB ID for relation
        modelVersion,
        resultJson,
        ts: new Date(event.occurred_at),
      },
    })

    logger.info('WeighVision inference completed', {
      eventId: event.event_id,
      tenantId: event.tenant_id,
      sessionId,
      modelVersion,
      traceId: event.trace_id,
    })

    return true
  } catch (error: any) {
    if (error.code === 'P2002') {
      logger.debug('Duplicate inference record (unique constraint)', {
        eventId: event.event_id,
        tenantId: event.tenant_id,
      })
      return false
    }
    logger.error('Error handling inference.completed', {
      error,
      eventId: event.event_id,
      tenantId: event.tenant_id,
    })
    throw error
  }
}
