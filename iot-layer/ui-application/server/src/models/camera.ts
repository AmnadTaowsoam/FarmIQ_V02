import fs from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '../db'
import { PATHS } from '../config'
import { fileExists, readJson } from '../utils'

type Diagnostics = Record<string, unknown>

export async function syncCameraConfig() {
  const exists = await fileExists(PATHS.cameraConfigDiagnostics)
  if (!exists) {
    return null
  }
  const diagnostics = (await readJson<Diagnostics>(PATHS.cameraConfigDiagnostics)) ?? {}
  const stat = await fs.stat(PATHS.cameraConfigDiagnostics)
  const profileName = path.basename(PATHS.cameraConfigDir)

  return prisma.cameraConfigSnapshot.create({
    data: {
      profile: profileName,
      updatedAt: stat.mtime,
      payload: JSON.stringify(diagnostics),
    },
  })
}

export async function latestCameraConfig() {
  return prisma.cameraConfigSnapshot.findFirst({
    orderBy: [{ createdAt: 'desc' }],
  })
}
