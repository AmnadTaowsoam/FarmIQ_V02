import path from 'node:path'
import { promises as fs } from 'node:fs'
import { PATHS } from '../config'

type Side = 'left' | 'right'

type SideFile = {
  fileName: string
  absolutePath: string
  mtimeMs: number
}

export type CalibratorImagePair = {
  pairKey: string
  leftFile: string | null
  rightFile: string | null
  leftUrl: string | null
  rightUrl: string | null
  updatedAt: string | null
  status: 'paired' | 'missing-left' | 'missing-right'
}

export type CalibratorDatasetSummary = {
  leftCount: number
  rightCount: number
  pairedCount: number
  unpairedCount: number
}

export type CalibratorDatasetResponse = {
  summary: CalibratorDatasetSummary
  pairs: CalibratorImagePair[]
}

export type RectifiedLatestPair = {
  pairKey: string
  leftFile: string
  rightFile: string
  capturedAt: string
}

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp'])

const sideDir = (side: Side) => path.join(PATHS.calibratorSamples, side)
const rectifiedDir = () => PATHS.calibratorRectified

const safeListFiles = async (dirPath: string): Promise<SideFile[]> => {
  try {
    const dirents = await fs.readdir(dirPath, { withFileTypes: true })
    const files = dirents.filter((entry) => entry.isFile())
    const withStat = await Promise.all(
      files.map(async (entry) => {
        const absolutePath = path.join(dirPath, entry.name)
        const stat = await fs.stat(absolutePath)
        return { fileName: entry.name, absolutePath, mtimeMs: stat.mtimeMs }
      })
    )
    return withStat.filter((file) => IMAGE_EXTENSIONS.has(path.extname(file.fileName).toLowerCase()))
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return []
    throw error
  }
}

const normalizePairKey = (fileName: string): string => {
  if (fileName.startsWith('left_')) return fileName.slice(5)
  if (fileName.startsWith('right_')) return fileName.slice(6)
  return fileName
}

const pairStatus = (hasLeft: boolean, hasRight: boolean): CalibratorImagePair['status'] => {
  if (hasLeft && hasRight) return 'paired'
  if (!hasLeft) return 'missing-left'
  return 'missing-right'
}

const makeImageUrl = (side: Side, fileName: string) =>
  `/api/calibrator/images/${side}/${encodeURIComponent(fileName)}`

export const listCalibratorImagePairs = async (): Promise<CalibratorDatasetResponse> => {
  const [leftFiles, rightFiles] = await Promise.all([safeListFiles(sideDir('left')), safeListFiles(sideDir('right'))])

  const pairs = new Map<
    string,
    {
      left?: SideFile
      right?: SideFile
    }
  >()

  for (const file of leftFiles) {
    const key = normalizePairKey(file.fileName)
    pairs.set(key, { ...(pairs.get(key) ?? {}), left: file })
  }
  for (const file of rightFiles) {
    const key = normalizePairKey(file.fileName)
    pairs.set(key, { ...(pairs.get(key) ?? {}), right: file })
  }

  const pairItems: CalibratorImagePair[] = [...pairs.entries()]
    .map(([pairKey, entry]) => {
      const left = entry.left
      const right = entry.right
      const latestMtime = Math.max(left?.mtimeMs ?? 0, right?.mtimeMs ?? 0)
      return {
        pairKey,
        leftFile: left?.fileName ?? null,
        rightFile: right?.fileName ?? null,
        leftUrl: left ? makeImageUrl('left', left.fileName) : null,
        rightUrl: right ? makeImageUrl('right', right.fileName) : null,
        updatedAt: latestMtime > 0 ? new Date(latestMtime).toISOString() : null,
        status: pairStatus(Boolean(left), Boolean(right)),
      }
    })
    .sort((a, b) => {
      const leftTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const rightTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return rightTime - leftTime
    })

  const pairedCount = pairItems.filter((item) => item.status === 'paired').length

  return {
    summary: {
      leftCount: leftFiles.length,
      rightCount: rightFiles.length,
      pairedCount,
      unpairedCount: pairItems.length - pairedCount,
    },
    pairs: pairItems,
  }
}

const validateFileName = (fileName: string): string => {
  if (!fileName || fileName.includes('/') || fileName.includes('\\') || path.basename(fileName) !== fileName) {
    throw new Error('invalid file name')
  }
  return fileName
}

const resolveSafePath = (side: Side, fileName: string): string => {
  const baseDir = sideDir(side)
  const resolved = path.resolve(baseDir, validateFileName(fileName))
  if (!resolved.startsWith(path.resolve(baseDir) + path.sep)) {
    throw new Error('invalid file path')
  }
  return resolved
}

export const findCalibratorImagePath = async (side: Side, fileName: string): Promise<string | null> => {
  const absolutePath = resolveSafePath(side, fileName)
  try {
    const stat = await fs.stat(absolutePath)
    return stat.isFile() ? absolutePath : null
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return null
    throw error
  }
}

export const deleteCalibratorImage = async (side: Side, fileName: string): Promise<boolean> => {
  const absolutePath = resolveSafePath(side, fileName)
  try {
    await fs.unlink(absolutePath)
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return false
    throw error
  }
}

export const deleteCalibratorPairByKey = async (pairKeyRaw: string): Promise<{ deleted: number }> => {
  const pairKey = validateFileName(pairKeyRaw)
  const dataset = await listCalibratorImagePairs()
  const pair = dataset.pairs.find((entry) => entry.pairKey === pairKey)
  if (!pair) return { deleted: 0 }

  let deleted = 0
  if (pair.leftFile) {
    const ok = await deleteCalibratorImage('left', pair.leftFile)
    if (ok) deleted += 1
  }
  if (pair.rightFile) {
    const ok = await deleteCalibratorImage('right', pair.rightFile)
    if (ok) deleted += 1
  }
  return { deleted }
}

const parseRectifiedFile = (fileName: string): { pairKey: string; side: Side; ts: string } | null => {
  if (fileName.includes('_raw_')) return null
  const match = /^(.*)_(left|right)_(\d{8}_\d{6}_\d{6})\.[^.]+$/i.exec(fileName)
  if (!match) return null
  const label = match[1]
  const side = match[2] as Side
  const ts = match[3]
  return { pairKey: `${label}_${ts}`, side, ts }
}

const tsToIso = (ts: string): string => {
  const match = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_(\d{6})$/.exec(ts)
  if (!match) return new Date().toISOString()
  const [, y, m, d, hh, mm, ss, micros] = match
  const ms = micros.slice(0, 3)
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}.${ms}Z`
}

export const findLatestRectifiedPair = async (): Promise<RectifiedLatestPair | null> => {
  const files = await safeListFiles(rectifiedDir())
  const pairs = new Map<
    string,
    {
      left?: SideFile
      right?: SideFile
      ts: string
      mtimeMs: number
    }
  >()

  for (const file of files) {
    const parsed = parseRectifiedFile(file.fileName)
    if (!parsed) continue
    const current = pairs.get(parsed.pairKey) ?? { ts: parsed.ts, mtimeMs: 0 }
    if (parsed.side === 'left') current.left = file
    if (parsed.side === 'right') current.right = file
    current.mtimeMs = Math.max(current.mtimeMs, file.mtimeMs)
    pairs.set(parsed.pairKey, current)
  }

  const latest = [...pairs.entries()]
    .filter(([, value]) => value.left && value.right)
    .sort((a, b) => b[1].mtimeMs - a[1].mtimeMs)[0]
  if (!latest) return null

  const [pairKey, value] = latest
  return {
    pairKey,
    leftFile: value.left!.fileName,
    rightFile: value.right!.fileName,
    capturedAt: tsToIso(value.ts),
  }
}

const resolveSafeRectifiedPath = (fileName: string): string => {
  const baseDir = rectifiedDir()
  const resolved = path.resolve(baseDir, validateFileName(fileName))
  if (!resolved.startsWith(path.resolve(baseDir) + path.sep)) {
    throw new Error('invalid file path')
  }
  return resolved
}

export const findRectifiedImagePath = async (fileName: string): Promise<string | null> => {
  const absolutePath = resolveSafeRectifiedPath(fileName)
  try {
    const stat = await fs.stat(absolutePath)
    return stat.isFile() ? absolutePath : null
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return null
    throw error
  }
}
