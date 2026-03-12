import fs from 'node:fs/promises'
import { prisma } from '../db'
import { PATHS } from '../config'
import { fileExists } from '../utils'
import { latestCaptureTime } from './capture'

export async function readServiceStatus() {
  const bufferExists = await fileExists(PATHS.serviceBuffer)
  const stateDbExists = await fileExists(PATHS.serviceStateDb)

  let bufferedEvents = 0
  if (bufferExists) {
    try {
      const raw = await fs.readFile(PATHS.serviceBuffer, 'utf-8')
      bufferedEvents = raw.split('\n').filter((line) => line.trim()).length
    } catch {
      bufferedEvents = 0
    }
  }

  const lastCaptureAt = await latestCaptureTime()

  const snapshot = await prisma.serviceSnapshot.create({
    data: {
      mqttConnected: bufferExists ? bufferedEvents === 0 : false,
      bufferedCount: bufferedEvents,
      lastCaptureAt,
      stateDbExists,
    },
  })

  return snapshot
}
