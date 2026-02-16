import fs from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { PATHS } from '../config'

export type BoardReferenceConfig = {
  board: {
    name: string
    color: string
    size_mm: {
      width: number
      height: number
    }
  }
  roi: {
    offset_mm: {
      x: number
      y: number
    }
    size_scale: {
      x: number
      y: number
    }
    padding_mm: {
      x: number
      y: number
    }
  }
  camera: {
    distance_to_board_mm: number
  }
  reference_plane: {
    axis: string
    z_mm: number
    normal: [number, number, number]
  }
  measurement: {
    unit: {
      length: string
    }
    usage: string[]
  }
  metadata: {
    created_by: string
    description: string
  }
}

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value
  return fallback
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item)).filter((item) => item.trim().length > 0)
}

const asTripleNumber = (value: unknown, fallback: [number, number, number]): [number, number, number] => {
  if (!Array.isArray(value) || value.length < 3) return fallback
  return [asNumber(value[0], fallback[0]), asNumber(value[1], fallback[1]), asNumber(value[2], fallback[2])]
}

const normalizeBoardReference = (input: unknown): BoardReferenceConfig => {
  const data = (input ?? {}) as Record<string, unknown>
  const board = (data.board ?? {}) as Record<string, unknown>
  const boardSize = (board.size_mm ?? {}) as Record<string, unknown>
  const roi = (data.roi ?? {}) as Record<string, unknown>
  const roiOffset = (roi.offset_mm ?? {}) as Record<string, unknown>
  const roiScale = (roi.size_scale ?? {}) as Record<string, unknown>
  const roiPadding = (roi.padding_mm ?? {}) as Record<string, unknown>
  const camera = (data.camera ?? {}) as Record<string, unknown>
  const referencePlane = (data.reference_plane ?? {}) as Record<string, unknown>
  const measurement = (data.measurement ?? {}) as Record<string, unknown>
  const measurementUnit = (measurement.unit ?? {}) as Record<string, unknown>
  const metadata = (data.metadata ?? {}) as Record<string, unknown>

  return {
    board: {
      name: asString(board.name, 'reference_board'),
      color: asString(board.color, 'blue'),
      size_mm: {
        width: asNumber(boardSize.width, 0),
        height: asNumber(boardSize.height, 0),
      },
    },
    roi: {
      offset_mm: {
        x: asNumber(roiOffset.x, 0),
        y: asNumber(roiOffset.y, 0),
      },
      size_scale: {
        x: asNumber(roiScale.x, 1),
        y: asNumber(roiScale.y, 1),
      },
      padding_mm: {
        x: asNumber(roiPadding.x, 0),
        y: asNumber(roiPadding.y, 0),
      },
    },
    camera: {
      distance_to_board_mm: asNumber(camera.distance_to_board_mm, 0),
    },
    reference_plane: {
      axis: asString(referencePlane.axis, 'Z'),
      z_mm: asNumber(referencePlane.z_mm, 0),
      normal: asTripleNumber(referencePlane.normal, [0, 0, 1]),
    },
    measurement: {
      unit: {
        length: asString(measurementUnit.length, 'mm'),
      },
      usage: asStringArray(measurement.usage),
    },
    metadata: {
      created_by: asString(metadata.created_by, 'weight-vision-calibrator'),
      description: asString(metadata.description, ''),
    },
  }
}

export const readBoardReference = async (): Promise<{ config: BoardReferenceConfig; updatedAt: string | null }> => {
  const raw = await fs.readFile(PATHS.boardReference, 'utf-8')
  const parsed = YAML.parse(raw)
  const stat = await fs.stat(PATHS.boardReference)
  return {
    config: normalizeBoardReference(parsed),
    updatedAt: stat.mtime.toISOString(),
  }
}

export const saveBoardReference = async (
  nextConfig: unknown
): Promise<{ config: BoardReferenceConfig; updatedAt: string }> => {
  const normalized = normalizeBoardReference(nextConfig)
  const yml = YAML.stringify(normalized, { indent: 2, lineWidth: 0 })
  await fs.mkdir(path.dirname(PATHS.boardReference), { recursive: true })
  await fs.writeFile(PATHS.boardReference, yml, 'utf-8')
  const stat = await fs.stat(PATHS.boardReference)
  return {
    config: normalized,
    updatedAt: stat.mtime.toISOString(),
  }
}
