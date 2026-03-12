import express from 'express'
import cors from 'cors'
import { prisma } from './db'
import { PATHS } from './config'
import { syncCalibrationRuns, listCalibrationRuns } from './models/calibration'
import {
  captureCountToday,
  findCaptureImage,
  latestCaptureImage,
  latestCaptureTime,
  loadCaptureMetadata,
  listCaptureSessions,
  pendingSessionsCount,
  refreshCaptureSession,
  syncCaptureSessions,
} from './models/capture'
import { syncCameraConfig, latestCameraConfig } from './models/camera'
import { readServiceStatus } from './models/service'
import { getCaptureControl, setCapturePaused, triggerManualCapture } from './models/captureControl'
import { readDockerContainersStatus } from './models/containers'
import { readBoardReference, saveBoardReference } from './models/boardReference'
import {
  deleteCalibratorImage,
  deleteCalibratorPairByKey,
  findLatestRectifiedPair,
  findCalibratorImagePath,
  findRectifiedImagePath,
  listCalibratorImagePairs,
} from './models/calibratorImages'
import { findLatestFile } from './utils'

const app = express()
const host = process.env.HOST ?? '0.0.0.0'
const corsOrigins = (process.env.CORS_ORIGINS ?? '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsMiddleware =
  corsOrigins.length === 0 || corsOrigins.includes('*')
    ? cors()
    : cors({
        origin: (origin, callback) => {
          // Allow non-browser requests and explicitly listed browser origins.
          if (!origin || corsOrigins.includes(origin)) {
            callback(null, true)
            return
          }
          callback(new Error(`CORS blocked for origin: ${origin}`))
        },
      })

app.use(corsMiddleware)
app.use(express.json())

const calibratorBaseUrl = process.env.CALIBRATOR_API_URL ?? 'http://localhost:5180'

async function proxyCalibrator(path: string, init?: RequestInit) {
  const resp = await fetch(`${calibratorBaseUrl}${path}`, init)
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(text || `Calibrator API error ${resp.status}`)
  }
  return resp.json()
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/system/containers', async (_req, res) => {
  try {
    const data = await readDockerContainersStatus()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/sync', async (_req, res) => {
  try {
    const [captures, calibrations] = await Promise.all([syncCaptureSessions(), syncCalibrationRuns()])
    await syncCameraConfig()
    await readServiceStatus()
    res.json({ synced: true, captures, calibrations })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.get('/api/overview', async (_req, res) => {
  const [lastSeen, capturesToday, sessionsPending] = await Promise.all([
    latestCaptureTime(),
    captureCountToday(),
    pendingSessionsCount(),
  ])

  res.json({
    stationId: 'ST-01',
    lastSeen: lastSeen ? lastSeen.toISOString() : null,
    capturesToday,
    sessionsPending,
  })
})

app.get('/api/calibrations', async (_req, res) => {
  const runs = await listCalibrationRuns()
  res.json(
    runs.map((run) => ({
      runId: run.runId,
      createdAt: run.createdAt ? run.createdAt.toISOString() : null,
      rmsStereo: run.rmsStereo,
      notes: run.notes,
    }))
  )
})

app.get('/api/captures', async (_req, res) => {
  const fromRaw = _req.query.from as string | undefined
  const toRaw = _req.query.to as string | undefined
  const limitRaw = _req.query.limit as string | undefined
  const from = fromRaw ? new Date(fromRaw) : undefined
  const to = toRaw ? new Date(toRaw) : undefined
  const limit = limitRaw ? Number(limitRaw) : undefined
  const sessions = await listCaptureSessions({
    from: from && !isNaN(from.getTime()) ? from : undefined,
    to: to && !isNaN(to.getTime()) ? to : undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
  })
  res.json(
    sessions.map((session) => ({
      sessionId: session.sessionId,
      capturedAt: session.capturedAt ? session.capturedAt.toISOString() : null,
      weightKg: session.weightKg,
      detectionsCount: session.detectionsCount,
      imageCount: session.imageCount,
      status: session.status,
    }))
  )
})

app.get('/api/captures/:sessionId/metadata', async (req, res) => {
  const metadata = await loadCaptureMetadata(req.params.sessionId)
  if (!metadata) {
    res.status(404).json({ error: 'metadata not found' })
    return
  }
  res.json(metadata)
})

app.post('/api/captures/:sessionId/refresh', async (req, res) => {
  const updated = await refreshCaptureSession(req.params.sessionId)
  if (!updated) {
    res.status(404).json({ error: 'session not found' })
    return
  }
  res.json({
    sessionId: updated.sessionId,
    capturedAt: updated.capturedAt ? updated.capturedAt.toISOString() : null,
    weightKg: updated.weightKg,
    detectionsCount: updated.detectionsCount,
    imageCount: updated.imageCount,
    status: updated.status,
  })
})

app.get('/api/captures/:sessionId/image', async (req, res) => {
  const variant = (req.query.variant as string) || 'left'
  if (!['left', 'right', 'vis'].includes(variant)) {
    res.status(400).json({ error: 'invalid variant' })
    return
  }
  const filePath = await findCaptureImage(req.params.sessionId, variant as 'left' | 'right' | 'vis')
  if (!filePath) {
    res.status(404).json({ error: 'image not found' })
    return
  }
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(filePath)
})

app.get('/api/capture/live-image', async (req, res) => {
  const variant = (req.query.variant as string) || 'left'
  if (!['left', 'right', 'vis'].includes(variant)) {
    res.status(400).json({ error: 'invalid variant' })
    return
  }
  const filePath = await latestCaptureImage(variant as 'left' | 'right' | 'vis')
  if (!filePath) {
    res.status(404).json({ error: 'image not found' })
    return
  }
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(filePath)
})

app.get('/api/calibrator/board/download', async (_req, res) => {
  const latest = await findLatestFile(PATHS.calibratorBoard, '.png')
  if (!latest) {
    res.status(404).json({ error: 'board not found' })
    return
  }
  res.download(latest)
})

app.get('/api/calibrator/images', async (_req, res) => {
  try {
    const dataset = await listCalibratorImagePairs()
    res.json(dataset)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.get('/api/calibrator/images/:side/:fileName', async (req, res) => {
  const side = req.params.side
  if (side !== 'left' && side !== 'right') {
    res.status(400).json({ error: 'invalid side' })
    return
  }
  try {
    const filePath = await findCalibratorImagePath(side, req.params.fileName)
    if (!filePath) {
      res.status(404).json({ error: 'image not found' })
      return
    }
    res.setHeader('Cache-Control', 'no-store')
    res.sendFile(filePath)
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

app.get('/api/calibrator/rectified/latest', async (_req, res) => {
  try {
    const latest = await findLatestRectifiedPair()
    if (!latest) {
      res.status(404).json({ error: 'rectified pair not found' })
      return
    }
    res.json({
      ...latest,
      leftUrl: `/api/calibrator/rectified/download/${encodeURIComponent(latest.leftFile)}`,
      rightUrl: `/api/calibrator/rectified/download/${encodeURIComponent(latest.rightFile)}`,
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.get('/api/calibrator/rectified/download/:fileName', async (req, res) => {
  try {
    const filePath = await findRectifiedImagePath(req.params.fileName)
    if (!filePath) {
      res.status(404).json({ error: 'image not found' })
      return
    }
    res.setHeader('Cache-Control', 'no-store')
    res.download(filePath)
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

app.delete('/api/calibrator/images/:side/:fileName', async (req, res) => {
  const side = req.params.side
  if (side !== 'left' && side !== 'right') {
    res.status(400).json({ error: 'invalid side' })
    return
  }
  try {
    const deleted = await deleteCalibratorImage(side, req.params.fileName)
    if (!deleted) {
      res.status(404).json({ error: 'image not found' })
      return
    }
    res.json({ deleted: true })
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

app.delete('/api/calibrator/pairs/:pairKey', async (req, res) => {
  try {
    const result = await deleteCalibratorPairByKey(req.params.pairKey)
    if (result.deleted === 0) {
      res.status(404).json({ error: 'pair not found' })
      return
    }
    res.json({ deleted: result.deleted })
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

app.get('/api/service/status', async (_req, res) => {
  const snapshot = await readServiceStatus()
  res.json({
    mqttConnected: snapshot.mqttConnected,
    bufferedEvents: snapshot.bufferedCount,
    lastCaptureAt: snapshot.lastCaptureAt ? snapshot.lastCaptureAt.toISOString() : null,
    stateDbExists: snapshot.stateDbExists,
  })
})

app.get('/api/camera-config', async (_req, res) => {
  const latest = await latestCameraConfig()
  if (!latest) {
    res.json({ profileName: 'unknown', lastUpdated: null, diagnostics: {} })
    return
  }
  res.json({
    profileName: latest.profile,
    lastUpdated: latest.updatedAt ? latest.updatedAt.toISOString() : null,
    diagnostics: JSON.parse(latest.payload),
  })
})

app.get('/api/calibrator/board-reference', async (_req, res) => {
  try {
    const data = await readBoardReference()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.put('/api/calibrator/board-reference', async (req, res) => {
  try {
    const payload = (req.body ?? {}) as { config?: unknown }
    const saved = await saveBoardReference(payload.config ?? payload)
    res.json(saved)
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

app.get('/api/capture/control', async (_req, res) => {
  try {
    const control = await getCaptureControl()
    res.json(control)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/capture/pause', async (_req, res) => {
  try {
    const control = await setCapturePaused(true)
    res.json(control)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/capture/resume', async (_req, res) => {
  try {
    const control = await setCapturePaused(false)
    res.json(control)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/capture/trigger', async (_req, res) => {
  try {
    const control = await triggerManualCapture()
    res.json(control)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/calibrator/jobs/capture-pairs', async (req, res) => {
  try {
    const data = await proxyCalibrator('/api/calibrator/jobs/capture-pairs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    })
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/calibrator/jobs/generate-board', async (req, res) => {
  try {
    const data = await proxyCalibrator('/api/calibrator/jobs/generate-board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    })
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/calibrator/jobs/mono-calib', async (req, res) => {
  try {
    const data = await proxyCalibrator('/api/calibrator/jobs/mono-calib', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    })
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/calibrator/jobs/stereo-calib', async (req, res) => {
  try {
    const data = await proxyCalibrator('/api/calibrator/jobs/stereo-calib', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    })
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/calibrator/jobs/capture-rectified', async (req, res) => {
  try {
    const data = await proxyCalibrator('/api/calibrator/jobs/capture-rectified', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    })
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/calibrator/jobs/floor-calib', async (req, res) => {
  try {
    const data = await proxyCalibrator('/api/calibrator/jobs/floor-calib', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    })
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.get('/api/calibrator/jobs', async (_req, res) => {
  try {
    const data = await proxyCalibrator('/api/calibrator/jobs')
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.get('/api/calibrator/jobs/:jobId', async (req, res) => {
  try {
    const data = await proxyCalibrator(`/api/calibrator/jobs/${req.params.jobId}`)
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

const port = Number(process.env.PORT ?? 5174)
app.listen(port, host, () => {
  console.log(`IoT UI API listening on ${host}:${port}`)
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
