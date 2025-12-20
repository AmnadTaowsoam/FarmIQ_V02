import fs from 'fs/promises'
import path from 'path'
import { JanitorConfig } from '../config'
import { logger } from '../utils/logger'

export type JanitorResult = {
  startedAt: string
  finishedAt: string
  deletedFiles: number
  freedBytes: number
  dryRun: boolean
  error?: string
}

type FileEntry = {
  path: string
  size: number
  mtimeMs: number
}

export class JanitorService {
  private readonly config: JanitorConfig

  constructor(config: JanitorConfig) {
    this.config = config
  }

  async run(): Promise<JanitorResult> {
    const startedAt = new Date().toISOString()
    let deletedFiles = 0
    let freedBytes = 0

    try {
      const basePath = path.resolve(this.config.mediaBasePath)
      const files = await this.collectFiles(basePath)
      const retentionCutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000

      const { freeBytes } = await this.getDiskUsage(basePath)
      let targetFreeBytes = this.config.minFreeDiskGb * 1024 ** 3

      const candidates = files
        .filter((file) => file.mtimeMs < retentionCutoff)
        .sort((a, b) => a.mtimeMs - b.mtimeMs)

      const emergencyCandidates = files
        .slice()
        .sort((a, b) => a.mtimeMs - b.mtimeMs)

      const shouldEmergency = freeBytes < targetFreeBytes
      const queue = shouldEmergency ? emergencyCandidates : candidates

      let currentFree = freeBytes

      for (const file of queue) {
        if (!file.path.startsWith(basePath)) {
          continue
        }

        if (!shouldEmergency && file.mtimeMs >= retentionCutoff) {
          continue
        }

        if (shouldEmergency && currentFree >= targetFreeBytes) {
          break
        }

        if (!this.config.dryRun) {
          await fs.unlink(file.path)
        }

        deletedFiles += 1
        freedBytes += file.size
        currentFree += file.size
      }

      const finishedAt = new Date().toISOString()
      return {
        startedAt,
        finishedAt,
        deletedFiles,
        freedBytes,
        dryRun: this.config.dryRun,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('Janitor run failed', { error: message })
      const finishedAt = new Date().toISOString()
      return {
        startedAt,
        finishedAt,
        deletedFiles,
        freedBytes,
        dryRun: this.config.dryRun,
        error: message,
      }
    }
  }

  private async collectFiles(basePath: string): Promise<FileEntry[]> {
    const entries: FileEntry[] = []
    const stack = [basePath]

    while (stack.length) {
      const current = stack.pop()
      if (!current) {
        continue
      }

      const dirEntries = await fs.readdir(current, { withFileTypes: true })

      for (const entry of dirEntries) {
        const fullPath = path.join(current, entry.name)
        if (entry.isDirectory()) {
          stack.push(fullPath)
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath)
          entries.push({ path: fullPath, size: stats.size, mtimeMs: stats.mtimeMs })
        }
      }
    }

    return entries
  }

  private async getDiskUsage(targetPath: string): Promise<{ freeBytes: number; totalBytes: number }> {
    const stats = await fs.statfs(targetPath)
    const freeBytes = stats.bavail * stats.bsize
    const totalBytes = stats.blocks * stats.bsize
    return { freeBytes, totalBytes }
  }
}
