import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export type PresignFn = (params: {
  bucket: string
  key: string
  contentType: string
  expiresIn: number
}) => Promise<string>

export type PresignRequest = {
  tenant_id: string
  farm_id: string
  barn_id: string
  device_id: string
  content_type: string
  filename: string
}

export function sanitizeFilename(filename: string): string {
  const base = path.basename(filename)
  if (base !== filename || filename.includes('..')) {
    throw new Error('invalid filename')
  }

  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, '_')
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    throw new Error('invalid filename')
  }
  return cleaned
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_')
}

export function buildObjectKey(params: {
  tenantId: string
  farmId: string
  barnId: string
  deviceId: string
  filename: string
  now: Date
}): string {
  const safeTenant = sanitizeSegment(params.tenantId)
  const safeFarm = sanitizeSegment(params.farmId)
  const safeBarn = sanitizeSegment(params.barnId)
  const safeDevice = sanitizeSegment(params.deviceId)
  const safeFilename = sanitizeFilename(params.filename)
  const ext = path.extname(safeFilename) || '.jpg'
  const id = uuidv4()
  const year = params.now.getUTCFullYear()
  const month = String(params.now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(params.now.getUTCDate()).padStart(2, '0')

  return [
    'tenants',
    safeTenant,
    'farms',
    safeFarm,
    'barns',
    safeBarn,
    'devices',
    safeDevice,
    'images',
    String(year),
    month,
    day,
    `${id}${ext}`,
  ].join('/')
}
