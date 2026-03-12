import fs from 'node:fs/promises'
import path from 'node:path'

export async function fileExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

export async function readJson<T>(target: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(target, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function listFiles(dir: string, ext?: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir)
    if (!ext) return entries.map((name) => path.join(dir, name))
    return entries.filter((name) => name.endsWith(ext)).map((name) => path.join(dir, name))
  } catch {
    return []
  }
}

export async function findLatestFile(dir: string, ext?: string): Promise<string | null> {
  const files = await listFiles(dir, ext)
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

export function parseRunTimestamp(runId: string): Date | null {
  const match = runId.match(/run_(\d{8})_(\d{6})/)
  if (!match) return null
  const [datePart, timePart] = match.slice(1)
  const year = Number(datePart.slice(0, 4))
  const month = Number(datePart.slice(4, 6)) - 1
  const day = Number(datePart.slice(6, 8))
  const hour = Number(timePart.slice(0, 2))
  const minute = Number(timePart.slice(2, 4))
  const second = Number(timePart.slice(4, 6))
  return new Date(Date.UTC(year, month, day, hour, minute, second))
}
