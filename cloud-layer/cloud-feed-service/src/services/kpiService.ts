import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

// Weight data from telemetry service (for MVP, we call via HTTP)
interface TelemetryReading {
  id: string
  tenantId: string
  farmId: string | null
  barnId: string | null
  deviceId: string
  batchId: string | null
  metric: string
  value: number | string
  unit: string | null
  occurredAt: string
}

interface TelemetryAggregate {
  id: string
  tenantId: string
  farmId: string | null
  barnId: string | null
  deviceId: string
  metric: string
  bucketStart: string
  bucketSize: string
  avgValue: number | string
  minValue: number | string
  maxValue: number | string
  count: number
}

interface DailyWeightData {
  date: string
  avgWeight: number | null
  weightGain: number | null
}

/**
 * Fetch weight data from telemetry service
 * TODO: For production, consider caching or direct DB access for performance
 */
async function fetchWeightData(params: {
  tenantId: string
  barnId: string
  batchId?: string | null
  startDate: Date
  endDate: Date
  headers?: Record<string, string>
}): Promise<DailyWeightData[]> {
  const telemetryBaseUrl =
    process.env.TELEMETRY_BASE_URL || 'http://cloud-telemetry-service:3000'

  try {
    // Try to get daily aggregates first (more efficient)
    const aggUrl = new URL(`${telemetryBaseUrl}/api/v1/telemetry/aggregates`)
    aggUrl.searchParams.set('tenantId', params.tenantId)
    aggUrl.searchParams.set('barnId', params.barnId)
    if (params.batchId) aggUrl.searchParams.set('batchId', params.batchId)
    aggUrl.searchParams.set('metric', 'weight')
    aggUrl.searchParams.set('from', params.startDate.toISOString())
    aggUrl.searchParams.set('to', params.endDate.toISOString())
    aggUrl.searchParams.set('bucket', '1d')

    const aggResponse = await fetch(aggUrl.toString(), {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        ...(params.headers || {}),
      },
    })

    if (aggResponse.ok) {
      const aggregates = (await aggResponse.json()) as TelemetryAggregate[]
      // Convert aggregates to daily weight data
      const dailyWeights: Map<string, { avgWeight: number | null; weightGain: number | null }> =
        new Map()

      // Group by date and compute average weight per day
      aggregates.forEach((agg) => {
        const date = new Date(agg.bucketStart).toISOString().split('T')[0]
        const avgValue = typeof agg.avgValue === 'string' ? parseFloat(agg.avgValue) : agg.avgValue

        if (!dailyWeights.has(date)) {
          dailyWeights.set(date, { avgWeight: avgValue, weightGain: null })
        } else {
          const existing = dailyWeights.get(date)!
          existing.avgWeight = avgValue
        }
      })

      // Compute weight gain (today - yesterday)
      const sortedDates = Array.from(dailyWeights.keys()).sort()
      sortedDates.forEach((date, idx) => {
        if (idx > 0) {
          const prevDate = sortedDates[idx - 1]
          const prevWeight = dailyWeights.get(prevDate)?.avgWeight
          const currWeight = dailyWeights.get(date)?.avgWeight

          if (prevWeight !== null && prevWeight !== undefined && currWeight !== null && currWeight !== undefined) {
            const gain = currWeight - prevWeight
            dailyWeights.get(date)!.weightGain = gain > 0 ? gain : null
          }
        }
      })

      // Return as array sorted by date (with date key for mapping)
      return sortedDates.map((date) => ({
        date,
        avgWeight: dailyWeights.get(date)!.avgWeight,
        weightGain: dailyWeights.get(date)!.weightGain,
      })) as DailyWeightData[]
    }

    // Fallback to raw readings if aggregates not available
    const readingsUrl = new URL(`${telemetryBaseUrl}/api/v1/telemetry/readings`)
    readingsUrl.searchParams.set('tenantId', params.tenantId)
    readingsUrl.searchParams.set('barnId', params.barnId)
    if (params.batchId) readingsUrl.searchParams.set('batchId', params.batchId)
    readingsUrl.searchParams.set('metric', 'weight')
    readingsUrl.searchParams.set('from', params.startDate.toISOString())
    readingsUrl.searchParams.set('to', params.endDate.toISOString())
    readingsUrl.searchParams.set('limit', '10000')

    const readingsResponse = await fetch(readingsUrl.toString(), {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        ...(params.headers || {}),
      },
    })

    if (!readingsResponse.ok) {
      logger.warn('Failed to fetch weight data from telemetry service', {
        status: readingsResponse.status,
      })
      return []
    }

    const readings = (await readingsResponse.json()) as TelemetryReading[]

    // Group readings by date and compute daily averages
    const dailyMap = new Map<string, number[]>()
    readings.forEach((reading) => {
      const date = new Date(reading.occurredAt).toISOString().split('T')[0]
      const value = typeof reading.value === 'string' ? parseFloat(reading.value) : reading.value

      if (!dailyMap.has(date)) {
        dailyMap.set(date, [])
      }
      dailyMap.get(date)!.push(value)
    })

    // Compute daily averages and weight gains
    const dailyWeights: DailyWeightData[] = []
    const sortedDates = Array.from(dailyMap.keys()).sort()

    sortedDates.forEach((date, idx) => {
      const values = dailyMap.get(date) || []
      const avgWeight = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null

      let weightGain: number | null = null
      if (idx > 0) {
        const prevDate = sortedDates[idx - 1]
        const prevValues = dailyMap.get(prevDate) || []
        const prevAvg =
          prevValues.length > 0 ? prevValues.reduce((a, b) => a + b, 0) / prevValues.length : null

        if (prevAvg !== null && avgWeight !== null && avgWeight > prevAvg) {
          weightGain = avgWeight - prevAvg
        }
      }

      dailyWeights.push({ date: sortedDates[idx], avgWeight, weightGain })
    })

    return dailyWeights
  } catch (error) {
    logger.error('Error fetching weight data from telemetry service', error)
    return []
  }
}

/**
 * Compute KPI series for a date range
 * Option A (MVP): Compute on-demand per request
 */
export async function computeKpiSeries(params: {
  tenantId: string
  barnId: string
  batchId?: string | null
  startDate: Date
  endDate: Date
  headers?: Record<string, string>
}) {
  const { tenantId, barnId, batchId, startDate, endDate } = params

  try {
    // 1. Fetch feed intake records grouped by date
    const intakeRecords = await prisma.feedIntakeRecord.findMany({
      where: {
        tenantId,
        barnId,
        ...(batchId ? { batchId } : {}),
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        quantityKg: true,
        occurredAt: true,
      },
    })

    // Group intake by date
    const dailyIntake = new Map<string, number>()
    intakeRecords.forEach((record) => {
      const date = record.occurredAt.toISOString().split('T')[0]
      const quantity = parseFloat(record.quantityKg.toString())
      dailyIntake.set(date, (dailyIntake.get(date) || 0) + quantity)
    })

    // 2. Fetch weight data from telemetry service
    const weightData = await fetchWeightData({
      tenantId,
      barnId,
      batchId,
      startDate,
      endDate,
      headers: params.headers,
    })

    // 3. Get animal count data (for ADG calculation)
    // TODO: Get from barn-records-service when available
    // For MVP, assume constant count or fetch from batch table if available
    let animalCount: number | null = null
    if (batchId) {
      // Try to get animal count from tenant-registry batch table
      // For MVP, we'll use a default or fetch from a future barn-records integration
      // For now, we'll compute ADG without animal count (per-animal gain if count available)
    }

    // 4. Get mortality data for adjustments
    // TODO: Get from barn-records-service when available
    const mortalityAdjustments = new Map<string, number>()

    // 5. Compute daily KPIs
    const kpiItems: Array<{
      recordDate: string
      fcr: number | null
      adgG: number | null
      sgrPct: number | null
    }> = []

    // Build a map of all dates in range
    const allDates = new Set<string>()
    Array.from(dailyIntake.keys()).forEach((date: string) => allDates.add(date))
    weightData.forEach((wd) => {
      allDates.add(wd.date)
    })
    // Also add all dates in the range (for completeness)
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      allDates.add(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }

    const sortedDates = Array.from(allDates).sort()

    // Build weight data map by date for quick lookup
    const weightDataMap = new Map<string, DailyWeightData>()
    weightData.forEach((wd) => {
      weightDataMap.set(wd.date, wd)
    })

    let prevWeight: number | null = null

    sortedDates.forEach((date) => {
      const feedKg = dailyIntake.get(date) || 0
      const weightInfo = weightDataMap.get(date) || { date, avgWeight: null, weightGain: null }

      const avgWeight = weightInfo.avgWeight
      let weightGainKg = weightInfo.weightGain
      const mortalityCount = mortalityAdjustments.get(date) || 0

      // Apply mortality adjustment to weight gain
      // Rule: If animal count decreases, weight gain should be adjusted
      // For MVP: simple proportional adjustment
      if (mortalityCount > 0 && weightGainKg !== null && animalCount !== null) {
        // Adjust: subtract weight contribution from dead animals
        // Simplified: assume dead animals had average weight
        const avgWeightPerAnimal = avgWeight && animalCount > 0 ? avgWeight / animalCount : null
        if (avgWeightPerAnimal !== null) {
          weightGainKg = weightGainKg - avgWeightPerAnimal * mortalityCount
        }
      }

      // Compute FCR
      // Corner case: weight_gain <= 0 => FCR = null
      let fcr: number | null = null
      if (feedKg > 0 && weightGainKg !== null && weightGainKg > 0) {
        fcr = feedKg / weightGainKg
      } else if (feedKg > 0 && (weightGainKg === null || weightGainKg <= 0)) {
        // Corner case: weight_gain <= 0 or missing
        fcr = null // Flagged by weightMissingFlag or weightGainNonPositive
      }
      // Corner case: missing intake => omit FCR (intakeMissingFlag = true)

      // Compute ADG (Average Daily Gain in grams per day)
      // ADG = weight_gain_kg / animal_count (or per animal if count available)
      let adgG: number | null = null
      if (weightGainKg !== null && weightGainKg > 0) {
        if (animalCount !== null && animalCount > 0) {
          // Per-animal ADG
          adgG = (weightGainKg / animalCount) * 1000 // Convert to grams
        } else {
          // Total ADG (no per-animal breakdown available)
          adgG = weightGainKg * 1000
        }
      }

      // Compute SGR (Specific Growth Rate in %)
      // SGR = ((ln(Wt) - ln(W0)) / days) * 100
      let sgrPct: number | null = null
      if (prevWeight !== null && avgWeight !== null && prevWeight > 0 && avgWeight > 0) {
        const days = 1 // Daily rollup
        sgrPct = ((Math.log(avgWeight) - Math.log(prevWeight)) / days) * 100
      }

      kpiItems.push({
        recordDate: date,
        fcr,
        adgG,
        sgrPct,
      })

      if (avgWeight !== null) {
        prevWeight = avgWeight
      }
    })

    // 6. Optionally upsert into kpi_daily for caching (MVP: skip for now, compute on-demand)

    return {
      items: kpiItems,
    }
  } catch (error) {
    logger.error('Error computing KPI series', error)
    throw error
  }
}

