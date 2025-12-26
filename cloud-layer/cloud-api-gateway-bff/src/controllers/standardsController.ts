import { Request, Response } from 'express'
import { proxyJson, proxyRaw } from '../services/standardsService'
import { logger } from '../utils/logger'

function buildHeaders(req: Request, res: Response) {
  const headers: Record<string, string> = {
    'x-request-id': (res.locals.requestId as string) || (req.headers['x-request-id'] as string) || '',
    'x-trace-id': (res.locals.traceId as string) || (req.headers['x-trace-id'] as string) || '',
  }

  const auth = req.headers.authorization as string | undefined
  if (auth) headers.authorization = auth

  const tenantHeader = (req.headers['x-tenant-id'] as string | undefined) || (req.query.tenantId as string | undefined)
  if (tenantHeader) headers['x-tenant-id'] = tenantHeader

  return headers
}

export async function proxyGet(req: Request, res: Response) {
  const headers = buildHeaders(req, res)
  const path = req.originalUrl
  const result = await proxyJson(path, { headers })
  if (!result.ok) {
    return res.status(result.status).json({
      error: {
        code: 'DOWNSTREAM_ERROR',
        message: `Downstream call failed (${result.status})`,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
  return res.status(result.status).json(result.data)
}

export async function proxyJsonWrite(req: Request, res: Response) {
  const headers = buildHeaders(req, res)
  const path = req.originalUrl
  const result = await proxyJson(path, {
    method: req.method as any,
    headers,
    body: req.body,
  })

  if (!result.ok) {
    return res.status(result.status).json({
      error: {
        code: 'DOWNSTREAM_ERROR',
        message: `Downstream call failed (${result.status})`,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
  return res.status(result.status).json(result.data)
}

export async function proxyImportCsv(req: Request, res: Response) {
  return proxyImportCsvToPath(req, res, req.originalUrl)
}

async function proxyImportCsvToPath(req: Request, res: Response, path: string) {
  const headers = buildHeaders(req, res)

  const contentType = req.headers['content-type']
  if (typeof contentType === 'string') {
    headers['content-type'] = contentType
  }

  const body = req.body as Buffer
  if (!Buffer.isBuffer(body)) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Expected raw multipart body',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const result = await proxyRaw(path, {
    method: 'POST',
    headers,
    body,
  })

  if (!result.ok) {
    logger.warn('Standards import downstream failed', { status: result.status })
    if (result.data) return res.status(result.status).json(result.data)
    return res.status(result.status).json({
      error: {
        code: 'DOWNSTREAM_ERROR',
        message: `Downstream call failed (${result.status})`,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  if (result.data) return res.status(result.status).json(result.data)
  return res.status(result.status).send(result.text || '')
}

export async function proxyHealth(req: Request, res: Response) {
  const headers = buildHeaders(req, res)
  const result = await proxyJson('/api/health', { headers })
  if (!result.ok) {
    return res.status(result.status).json({
      error: {
        code: 'DOWNSTREAM_ERROR',
        message: `Downstream call failed (${result.status})`,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
  return res.status(result.status).json(result.data)
}

export async function proxyReady(req: Request, res: Response) {
  const headers = buildHeaders(req, res)
  const result = await proxyJson('/api/ready', { headers })
  if (!result.ok) {
    return res.status(result.status).json({
      error: {
        code: 'DOWNSTREAM_ERROR',
        message: `Downstream call failed (${result.status})`,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
  return res.status(result.status).json(result.data)
}

export async function proxyImportCsvAlias(req: Request, res: Response) {
  const originalUrl = req.originalUrl || ''
  const queryIndex = originalUrl.indexOf('?')
  const query = queryIndex >= 0 ? originalUrl.slice(queryIndex) : ''
  return proxyImportCsvToPath(req, res, `/api/v1/standards/imports/csv${query}`)
}

export async function getUiCatalog(req: Request, res: Response) {
  const headers = buildHeaders(req, res)

  const [species, companies, lines, schemas] = await Promise.all([
    proxyJson('/api/v1/standards/catalog/species', { headers }),
    proxyJson('/api/v1/standards/catalog/breeder-companies', { headers }),
    proxyJson('/api/v1/standards/catalog/genetic-lines', { headers }),
    proxyJson('/api/v1/standards/catalog/standard-schemas', { headers }),
  ])

  const anyFailed = [species, companies, lines, schemas].some((r) => !r.ok)
  if (anyFailed) {
    return res.status(502).json({
      error: {
        code: 'DOWNSTREAM_ERROR',
        message: 'Failed to load standards catalog',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  return res.json({
    data: {
      species: (species.data as any)?.data ?? species.data,
      breeder_companies: (companies.data as any)?.data ?? companies.data,
      genetic_lines: (lines.data as any)?.data ?? lines.data,
      standard_schemas: (schemas.data as any)?.data ?? schemas.data,
    },
  })
}

export async function getUiTargets(req: Request, res: Response) {
  const headers = buildHeaders(req, res)
  const tenantId = (req.query.tenantId as string | undefined) || (req.headers['x-tenant-id'] as string | undefined)
  if (!tenantId) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'tenantId is required',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const q = new URLSearchParams()
  q.set('setType', 'TARGET')
  q.set('tenantId', tenantId)
  if (req.query.farmId) q.set('farmId', String(req.query.farmId))
  if (req.query.houseId) q.set('houseId', String(req.query.houseId))
  if (req.query.flockId) q.set('flockId', String(req.query.flockId))
  if (req.query.standardSchemaCode) q.set('standardSchemaCode', String(req.query.standardSchemaCode))
  if (req.query.speciesCode) q.set('speciesCode', String(req.query.speciesCode))
  if (req.query.geneticLineCode) q.set('geneticLineCode', String(req.query.geneticLineCode))
  q.set('page', String(req.query.page || 1))
  q.set('pageSize', String(req.query.pageSize || 50))

  const result = await proxyJson(`/api/v1/standards/sets?${q.toString()}`, { headers })
  if (!result.ok) {
    return res.status(result.status).json({
      error: {
        code: 'DOWNSTREAM_ERROR',
        message: `Downstream call failed (${result.status})`,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
  return res.status(result.status).json(result.data)
}
