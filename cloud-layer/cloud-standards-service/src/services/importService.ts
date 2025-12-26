import { Request, Response } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import { logger } from '../utils/logger'
import { prisma } from './db'
import { createSet, createImportJob, upsertRows, getSpeciesByCode, getGeneticLineByCode, getStandardSchemaByCode } from './standardsService'

const importFieldsSchema = z.object({
  standardSchemaCode: z.string().min(1),
  setType: z.enum(['REFERENCE', 'STANDARD', 'TARGET']),
  scope: z.enum(['GLOBAL', 'TENANT', 'FARM', 'HOUSE', 'FLOCK']),
  unitSystem: z.enum(['METRIC', 'IMPERIAL']),
  sex: z.enum(['AS_HATCHED', 'MALE', 'FEMALE', 'MIXED']),
  versionTag: z.string().min(1),
  mode: z.enum(['create_new_set', 'update_existing_set']).default('create_new_set'),
  setId: z.string().optional(),
  speciesCode: z.string().optional(),
  geneticLineCode: z.string().optional(),
  tenantId: z.string().optional(),
  farmId: z.string().optional(),
  houseId: z.string().optional(),
  flockId: z.string().optional(),
  dryRun: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === 'string' ? v === 'true' : v ?? true)),
  name: z.string().optional(),
})

type ParsedForm = {
  fields: Record<string, string>
  file?: {
    filename: string
    contentType: string
    data: Buffer
  }
}

async function readRawBody(req: Request, limitBytes: number) {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buf.length
    if (total > limitBytes) {
      throw new Error('Payload too large')
    }
    chunks.push(buf)
  }
  return Buffer.concat(chunks)
}

function parseMultipartFormData(body: Buffer, contentType: string): ParsedForm {
  const boundaryMatch = contentType.match(/boundary=([^;]+)/i)
  if (!boundaryMatch) {
    throw new Error('Missing multipart boundary')
  }
  const boundary = boundaryMatch[1]
  const delimiter = Buffer.from(`--${boundary}`)

  const parts: Buffer[] = []
  let start = body.indexOf(delimiter)
  if (start === -1) throw new Error('Invalid multipart body')
  start += delimiter.length

  while (start < body.length) {
    // Skip CRLF
    if (body[start] === 0x0d && body[start + 1] === 0x0a) start += 2
    const next = body.indexOf(delimiter, start)
    if (next === -1) break
    const part = body.slice(start, next)
    start = next + delimiter.length
    // End marker
    if (body[start] === 0x2d && body[start + 1] === 0x2d) break
    if (part.length) parts.push(part)
  }

  const fields: Record<string, string> = {}
  let file: ParsedForm['file']

  for (const rawPart of parts) {
    const headerEnd = rawPart.indexOf('\r\n\r\n')
    if (headerEnd === -1) continue
    const headerText = rawPart.slice(0, headerEnd).toString('utf8')
    const content = rawPart.slice(headerEnd + 4)
    const cleaned = content.slice(0, Math.max(0, content.length - 2)) // trim trailing \r\n

    const disposition = headerText.match(/content-disposition:\s*form-data;\s*([^\\r\\n]+)/i)
    if (!disposition) continue

    const nameMatch = headerText.match(/name="([^"]+)"/i)
    if (!nameMatch) continue
    const name = nameMatch[1]

    const filenameMatch = headerText.match(/filename="([^"]*)"/i)
    const typeMatch = headerText.match(/content-type:\s*([^\\r\\n]+)/i)

    if (filenameMatch) {
      file = {
        filename: filenameMatch[1] || 'upload.csv',
        contentType: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
        data: cleaned,
      }
      continue
    }

    fields[name] = cleaned.toString('utf8')
  }

  return { fields, file }
}

function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  const line: string[] = []
  const pushCell = () => {
    line.push(current)
    current = ''
  }
  const pushLine = () => {
    if (line.length === 1 && line[0].trim() === '') {
      line.length = 0
      return
    }
    rows.push([...line])
    line.length = 0
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      const next = text[i + 1]
      if (inQuotes && next === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && ch === ',') {
      pushCell()
      continue
    }

    if (!inQuotes && ch === '\n') {
      pushCell()
      pushLine()
      continue
    }

    if (!inQuotes && ch === '\r') continue

    current += ch
  }

  pushCell()
  if (line.length) pushLine()

  if (!rows.length) return []

  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {}
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = (r[i] ?? '').trim()
    }
    return obj
  })
}

type JsonSchema = {
  type?: string
  required?: string[]
  properties?: Record<string, { type?: string }>
}

function validatePayloadAgainstSchema(payload: Record<string, unknown>, schema: JsonSchema) {
  const errors: Array<{ column?: string; message: string }> = []
  const required = schema.required || []
  for (const key of required) {
    if (!(key in payload)) errors.push({ column: key, message: 'Missing required field' })
  }
  const properties = schema.properties || {}
  for (const [key, def] of Object.entries(properties)) {
    if (!(key in payload)) continue
    const value = payload[key]
    const expected = def.type
    if (!expected) continue
    if (expected === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) errors.push({ column: key, message: 'Expected number' })
    } else if (expected === 'integer') {
      if (typeof value !== 'number' || !Number.isInteger(value)) errors.push({ column: key, message: 'Expected integer' })
    } else if (expected === 'string') {
      if (typeof value !== 'string') errors.push({ column: key, message: 'Expected string' })
    } else if (expected === 'boolean') {
      if (typeof value !== 'boolean') errors.push({ column: key, message: 'Expected boolean' })
    }
  }
  return errors
}

function getCsvSpec(schemaRow: any): { dimColumn: string; required: string[]; optional: string[] } {
  const csv = schemaRow.csvColumnsJson as any
  if (csv && typeof csv === 'object') {
    const dimColumn = typeof csv.dimColumn === 'string' ? csv.dimColumn : ''
    const required = Array.isArray(csv.required) ? csv.required.map(String) : []
    const optional = Array.isArray(csv.optional) ? csv.optional.map(String) : []
    return {
      dimColumn: dimColumn || '',
      required,
      optional,
    }
  }
  return { dimColumn: '', required: [], optional: [] }
}

function toNumberOrNull(value: string) {
  if (value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function importCsv(req: Request, res: Response) {
  const contentType = (req.headers['content-type'] || '').toString()
  const rawBody = await readRawBody(req, 10 * 1024 * 1024)

  let form: ParsedForm
  if (contentType.includes('multipart/form-data')) {
    form = parseMultipartFormData(rawBody, contentType)
  } else {
    // Fallback: treat as raw CSV, fields via query
    form = { fields: Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k, String(v)])) }
    form.file = { filename: 'upload.csv', contentType: contentType || 'text/csv', data: rawBody }
  }

  if (!form.file) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'file is required',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const parsedFields = importFieldsSchema.safeParse(form.fields)
  if (!parsedFields.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsedFields.error.message,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const fields = parsedFields.data
  const tenantId = fields.scope === 'GLOBAL' ? null : getTenantIdFromRequest(res, fields.tenantId)
  if (fields.scope !== 'GLOBAL' && !tenantId) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'tenantId is required for non-GLOBAL scope',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const standardSchema = await getStandardSchemaByCode(fields.standardSchemaCode)
  if (!standardSchema || !standardSchema.isActive) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Unknown or inactive standardSchemaCode: ${fields.standardSchemaCode}`,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const csvText = form.file.data.toString('utf8')
  const fileHash = crypto.createHash('sha256').update(form.file.data).digest('hex')
  const dataRows = parseCsv(csvText)

  const csvSpec = getCsvSpec(standardSchema)
  const requiredCols = csvSpec.required
  const errors: Array<{ line?: number; column?: string; message: string }> = []

  if (!dataRows.length) {
    errors.push({ message: 'CSV has no data rows' })
  } else {
    for (const col of requiredCols) {
      if (!(col in dataRows[0])) {
        errors.push({ column: col, message: `Missing required column: ${col}` })
      }
    }
  }

  const upsertPayload: Array<{
    dimType: any
    dimFrom: number
    dimTo?: number
    phase?: string
    payloadJson: Record<string, unknown>
  }> = []

  if (!errors.length) {
    const dimTypeDefault = standardSchema.dimTypeDefault as unknown as string
    const dimColumn =
      csvSpec.dimColumn ||
      (dimTypeDefault === 'AGE_DAY'
        ? 'age_day'
        : dimTypeDefault === 'AGE_WEEK'
          ? 'age_week'
          : dimTypeDefault === 'PHASE'
            ? 'phase'
            : 'dim')

    dataRows.forEach((row, index) => {
      const lineNo = index + 2 // header is line 1
      const dimType = dimTypeDefault
      const payload: Record<string, unknown> = {}

      // Dim handling
      if (dimType === 'PHASE') {
        const phase = row[dimColumn]
        if (!phase) {
          errors.push({ line: lineNo, column: dimColumn, message: 'phase is required' })
          return
        }
        for (const col of requiredCols.filter((c) => c !== dimColumn)) {
          const val = toNumberOrNull(row[col])
          if (val === null) {
            errors.push({ line: lineNo, column: col, message: 'Invalid number' })
            return
          }
          payload[col] = val
        }

        const schemaErrors = validatePayloadAgainstSchema(payload, standardSchema.payloadSchemaJson as any)
        schemaErrors.forEach((e) => errors.push({ line: lineNo, column: e.column, message: e.message }))
        if (schemaErrors.length) return

        upsertPayload.push({ dimType: 'PHASE', dimFrom: index, phase, payloadJson: payload })
        return
      }

      const dimValue = toNumberOrNull(row[dimColumn])
      if (dimValue === null) {
        errors.push({ line: lineNo, column: dimColumn, message: 'Invalid number' })
        return
      }
      for (const col of requiredCols.filter((c) => c !== dimColumn)) {
        const val = toNumberOrNull(row[col])
        if (val === null) {
          errors.push({ line: lineNo, column: col, message: 'Invalid number' })
          return
        }
        payload[col] = val
      }

      const schemaErrors = validatePayloadAgainstSchema(payload, standardSchema.payloadSchemaJson as any)
      schemaErrors.forEach((e) => errors.push({ line: lineNo, column: e.column, message: e.message }))
      if (schemaErrors.length) return

      upsertPayload.push({ dimType, dimFrom: dimValue, payloadJson: payload })
    })
  }

  const summary: Prisma.InputJsonValue = {
    rowsParsed: dataRows.length,
    rowsPrepared: upsertPayload.length,
    errorsCount: errors.length,
    fileHash,
  }

  const dryRun = fields.dryRun ?? true

  const job = await createImportJob({
    status: errors.length ? 'FAILED' : dryRun ? 'VALIDATED' : 'DRAFT',
    filename: form.file.filename,
    fileHash,
    uploadedBy: res.locals.userId,
    dryRun,
    summaryJson: summary,
    errorJson: errors.length ? (errors as unknown as Prisma.InputJsonValue) : undefined,
  })

  if (errors.length) {
    await prisma.importJobError.createMany({
      data: errors.map((e) => ({
        jobId: job.id,
        line: e.line ?? null,
        column: e.column ?? null,
        message: e.message,
      })),
    })
    return {
      jobId: job.id,
      dryRun: true,
      errors,
      preview: upsertPayload.slice(0, 20),
    }
  }

  if (dryRun) {
    return {
      jobId: job.id,
      dryRun: true,
      errors: [],
      preview: upsertPayload.slice(0, 50),
    }
  }

  // Commit
  if (fields.mode === 'create_new_set') {
    if (!fields.speciesCode) {
      return {
        jobId: job.id,
        dryRun: true,
        errors: [{ message: 'speciesCode is required when mode=create_new_set' }],
        preview: [],
      }
    }
  }

  const species =
    fields.mode === 'create_new_set' ? await getSpeciesByCode(fields.speciesCode || '') : null
  if (fields.mode === 'create_new_set' && !species) {
    return {
      jobId: job.id,
      dryRun: true,
      errors: [{ message: `Unknown speciesCode: ${fields.speciesCode}` }],
      preview: [],
    }
  }

  const geneticLine =
    fields.geneticLineCode ? await getGeneticLineByCode(fields.geneticLineCode) : null
  if (fields.geneticLineCode && !geneticLine) {
    return {
      jobId: job.id,
      dryRun: true,
      errors: [{ message: `Unknown geneticLineCode: ${fields.geneticLineCode}` }],
      preview: [],
    }
  }

  const setId =
    fields.mode === 'update_existing_set'
      ? fields.setId
      : (
          await createSet({
            name: fields.name || `Imported ${fields.standardSchemaCode} ${new Date().toISOString()}`,
            setType: fields.setType,
            standardSchemaId: standardSchema.id,
            unitSystem: fields.unitSystem,
            sex: fields.sex,
            scope: fields.scope,
            tenantId: tenantId || undefined,
            farmId: fields.farmId,
            houseId: fields.houseId,
            flockId: fields.flockId,
            versionTag: fields.versionTag,
            isActive: false,
            speciesId: species!.id,
            geneticLineId: geneticLine?.id || undefined,
          })
        ).id

  if (!setId) {
    return {
      jobId: job.id,
      dryRun: true,
      errors: [{ message: 'setId is required for update_existing_set' }],
      preview: [],
    }
  }

  await prisma.$transaction(async (tx) => {
    await upsertRows(setId, upsertPayload as any)
    await tx.importJob.update({
      where: { id: job.id },
      data: { status: 'COMMITTED', setId },
    })
  })

  logger.info('CSV import committed', { jobId: job.id, setId })
  return { jobId: job.id, dryRun: false, setId }
}
