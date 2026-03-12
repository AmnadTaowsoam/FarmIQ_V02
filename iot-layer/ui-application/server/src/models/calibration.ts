import fs from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '../db'
import { PATHS } from '../config'
import { listFiles, parseRunTimestamp, readJson } from '../utils'

type Diagnostics = {
  rms_stereo?: number
  rmsStereo?: number
  notes?: string
}

export async function syncCalibrationRuns(): Promise<number> {
  const runDirs = await listFiles(PATHS.calibratorOutputs)
  let count = 0

  for (const runDir of runDirs) {
    const stat = await fs
      .stat(runDir)
      .then((s) => (s.isDirectory() ? s : null))
      .catch(() => null)
    if (!stat) continue

    const runId = path.basename(runDir)
    if (!runId.startsWith('run_')) continue

    const diagPath = path.join(runDir, 'diagnostics.json')
    const diagnostics = (await readJson<Diagnostics>(diagPath)) ?? {}
    const createdAt = parseRunTimestamp(runId)

    const rmsStereo = diagnostics.rms_stereo ?? diagnostics.rmsStereo ?? null
    const notes = diagnostics.notes ?? null

    await prisma.calibrationRun.upsert({
      where: { runId },
      update: { createdAt, rmsStereo, notes },
      create: { runId, createdAt, rmsStereo, notes },
    })
    count += 1
  }

  return count
}

export async function listCalibrationRuns() {
  return prisma.calibrationRun.findMany({
    orderBy: [{ createdAt: 'desc' }],
    take: 20,
  })
}
