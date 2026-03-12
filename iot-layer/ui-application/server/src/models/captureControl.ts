import fs from 'node:fs/promises'
import path from 'node:path'
import { PATHS } from '../config'

export type CaptureControl = {
  paused: boolean
  trigger_id: number
  updated_at: string
}

const defaultControl = (): CaptureControl => ({
  paused: false,
  trigger_id: 0,
  updated_at: new Date().toISOString(),
})

async function readFile(): Promise<CaptureControl> {
  try {
    const raw = await fs.readFile(PATHS.captureControl, 'utf-8')
    const data = JSON.parse(raw)
    return {
      paused: Boolean(data.paused),
      trigger_id: Number(data.trigger_id ?? 0),
      updated_at: data.updated_at ?? new Date().toISOString(),
    }
  } catch {
    const fallback = defaultControl()
    await writeFile(fallback)
    return fallback
  }
}

async function writeFile(control: CaptureControl) {
  await fs.mkdir(path.dirname(PATHS.captureControl), { recursive: true })
  await fs.writeFile(PATHS.captureControl, JSON.stringify(control, null, 2), 'utf-8')
}

export async function getCaptureControl(): Promise<CaptureControl> {
  return readFile()
}

export async function setCapturePaused(paused: boolean): Promise<CaptureControl> {
  const current = await readFile()
  const next = { ...current, paused, updated_at: new Date().toISOString() }
  await writeFile(next)
  return next
}

export async function triggerManualCapture(): Promise<CaptureControl> {
  const current = await readFile()
  const next = {
    ...current,
    trigger_id: (current.trigger_id ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }
  await writeFile(next)
  return next
}
