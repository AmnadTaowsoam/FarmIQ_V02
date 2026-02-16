import fs from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '../db'
import { PATHS } from '../config'
import { fileExists, listFiles, readJson } from '../utils'

type CaptureMetadata = {
  image_id?: string
  session_id?: string
  timestamp?: string
  detections?: unknown[]
  scale?: { weight_kg?: number }
}

const CAPTURE_RETENTION_LIMIT = 100

async function removeCaptureFiles(sessionId: string, sourcePath?: string | null) {
  const metadataPath = sourcePath ?? path.join(PATHS.captureMetadata, `${sessionId}.json`)
  try {
    await fs.unlink(metadataPath)
  } catch {
    // ignore
  }

  const images = await listFiles(PATHS.captureImages)
  for (const img of images) {
    if (!img.includes(sessionId)) continue
    try {
      await fs.unlink(img)
    } catch {
      // ignore
    }
  }
}

async function enforceCaptureRetention(limit: number) {
  const total = await prisma.captureSession.count()
  if (total <= limit) return

  const toDelete = await prisma.captureSession.findMany({
    orderBy: [{ capturedAt: 'asc' }, { createdAt: 'asc' }],
    take: total - limit,
    select: { sessionId: true, sourcePath: true },
  })

  for (const item of toDelete) {
    await removeCaptureFiles(item.sessionId, item.sourcePath)
    await prisma.captureSession.deleteMany({ where: { sessionId: item.sessionId } })
  }
}

export async function syncCaptureSessions(): Promise<number> {
  const files = await listFiles(PATHS.captureMetadata, '.json')
  let count = 0

  for (const file of files) {
    const metadata = await readJson<CaptureMetadata>(file)
    if (!metadata) continue

    const sessionId = metadata.session_id || metadata.image_id || path.parse(file).name
    const capturedAt = metadata.timestamp ? new Date(metadata.timestamp) : null
    const detectionsCount = Array.isArray(metadata.detections) ? metadata.detections.length : 0
    const weightKg = metadata.scale?.weight_kg ?? null

    const images = await listFiles(PATHS.captureImages)
    const imageCount = images.filter((img) => img.includes(sessionId)).length
    const status = imageCount > 0 ? 'complete' : 'missing-images'

    await prisma.captureSession.upsert({
      where: { sessionId },
      update: {
        capturedAt,
        weightKg,
        detectionsCount,
        imageCount,
        status,
        sourcePath: file,
      },
      create: {
        sessionId,
        capturedAt,
        weightKg,
        detectionsCount,
        imageCount,
        status,
        sourcePath: file,
      },
    })
    count += 1
  }

  await enforceCaptureRetention(CAPTURE_RETENTION_LIMIT)
  return count
}

export async function refreshCaptureSession(sessionId: string) {
  const fromDb = await prisma.captureSession.findUnique({
    where: { sessionId },
    select: { sourcePath: true },
  })
  const sourcePath = fromDb?.sourcePath ?? path.join(PATHS.captureMetadata, `${sessionId}.json`)
  const metadata = await readJson<CaptureMetadata>(sourcePath)
  if (!metadata) {
    return null
  }

  const capturedAt = metadata.timestamp ? new Date(metadata.timestamp) : null
  const detectionsCount = Array.isArray(metadata.detections) ? metadata.detections.length : 0
  const weightKg = metadata.scale?.weight_kg ?? null

  const images = await listFiles(PATHS.captureImages)
  const imageCount = images.filter((img) => img.includes(sessionId)).length
  const status = imageCount > 0 ? 'complete' : 'missing-images'

  return prisma.captureSession.upsert({
    where: { sessionId },
    update: {
      capturedAt,
      weightKg,
      detectionsCount,
      imageCount,
      status,
      sourcePath,
    },
    create: {
      sessionId,
      capturedAt,
      weightKg,
      detectionsCount,
      imageCount,
      status,
      sourcePath,
    },
  })
}

export async function listCaptureSessions(params?: { from?: Date; to?: Date; limit?: number }) {
  const limit = Math.min(params?.limit ?? CAPTURE_RETENTION_LIMIT, CAPTURE_RETENTION_LIMIT)
  const where =
    params?.from || params?.to
      ? {
          capturedAt: {
            ...(params?.from ? { gte: params.from } : {}),
            ...(params?.to ? { lte: params.to } : {}),
          },
        }
      : undefined
  return prisma.captureSession.findMany({
    where,
    orderBy: [{ capturedAt: 'desc' }],
    take: limit,
  })
}

export async function loadCaptureMetadata(sessionId: string): Promise<CaptureMetadata | null> {
  const fromDb = await prisma.captureSession.findUnique({
    where: { sessionId },
    select: { sourcePath: true },
  })
  if (fromDb?.sourcePath && (await fileExists(fromDb.sourcePath))) {
    return readJson<CaptureMetadata>(fromDb.sourcePath)
  }
  const fallbackPath = path.join(PATHS.captureMetadata, `${sessionId}.json`)
  if (await fileExists(fallbackPath)) {
    return readJson<CaptureMetadata>(fallbackPath)
  }
  return null
}

type CaptureImageVariant = 'left' | 'right' | 'vis'

const IMAGE_SUFFIX: Record<CaptureImageVariant, string> = {
  left: '_left.jpg',
  right: '_right.jpg',
  vis: '_vis.jpg',
}

export async function findCaptureImage(sessionId: string, variant: CaptureImageVariant): Promise<string | null> {
  const suffix = IMAGE_SUFFIX[variant]
  const direct = path.join(PATHS.captureImages, `${sessionId}${suffix}`)
  if (await fileExists(direct)) {
    return direct
  }
  const files = await listFiles(PATHS.captureImages, suffix)
  const match = files.find((file) => path.basename(file).startsWith(sessionId))
  return match ?? null
}

export async function latestCaptureImage(variant: CaptureImageVariant): Promise<string | null> {
  const suffix = IMAGE_SUFFIX[variant]
  const files = await listFiles(PATHS.captureImages, suffix)
  if (!files.length) return null
  let latestPath: string | null = null
  let latestTime = -1
  for (const file of files) {
    try {
      const stat = await fs.stat(file)
      if (stat.mtimeMs > latestTime) {
        latestTime = stat.mtimeMs
        latestPath = file
      }
    } catch {
      continue
    }
  }
  return latestPath
}

export async function latestCaptureTime(): Promise<Date | null> {
  const latest = await prisma.captureSession.findFirst({
    orderBy: [{ capturedAt: 'desc' }],
  })
  return latest?.capturedAt ?? null
}

export async function captureCountToday(): Promise<number> {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return prisma.captureSession.count({
    where: {
      capturedAt: {
        gte: start,
      },
    },
  })
}

export async function pendingSessionsCount(): Promise<number> {
  return prisma.captureSession.count({
    where: {
      status: {
        not: 'complete',
      },
    },
  })
}
