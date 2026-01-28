import { Request, Response } from 'express'
import { z } from 'zod'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import {
  adjustSet,
  cloneSet,
  createSet,
  deleteSet,
  getImportJob,
  getSet,
  getGeneticLineByCode,
  listBreederCompanies,
  listGeneticLines,
  listSpeciesCatalog,
  listStandardSchemas,
  listRows,
  listSets,
  getSpeciesByCode,
  getStandardSchemaByCode,
  patchSet,
  resolveActiveSet,
  upsertBreederCompany,
  upsertGeneticLine,
  upsertSpeciesCatalog,
  upsertStandardSchema,
  upsertRows,
} from '../services/standardsService'
import { importCsv } from '../services/importService'
import {
  publishStandardCreated,
  publishStandardUpdated,
  publishStandardDeleted,
} from '../utils/rabbitmq'

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
})

export async function listSetsHandler(req: Request, res: Response) {
  const parsed = paginationSchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.message,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const { page, pageSize } = parsed.data

  const speciesCode = (req.query.speciesCode as string | undefined) || (req.query.species_code as string | undefined)
  const geneticLineCode =
    (req.query.geneticLineCode as string | undefined) || (req.query.genetic_line_code as string | undefined)
  const standardSchemaCode =
    (req.query.standardSchemaCode as string | undefined) || (req.query.standard_schema_code as string | undefined)

  const speciesId =
    (req.query.speciesId as string | undefined) || (speciesCode ? (await getSpeciesByCode(speciesCode))?.id : undefined)
  const geneticLineId =
    (req.query.geneticLineId as string | undefined) ||
    (geneticLineCode ? (await getGeneticLineByCode(geneticLineCode))?.id : undefined)
  const standardSchemaId =
    (req.query.standardSchemaId as string | undefined) ||
    (standardSchemaCode ? (await getStandardSchemaByCode(standardSchemaCode))?.id : undefined)

  const result = await listSets({
    page,
    pageSize,
    filters: {
      speciesId,
      geneticLineId,
      standardSchemaId,
      setType: req.query.setType as string | undefined,
      scope: req.query.scope as string | undefined,
      unitSystem: req.query.unitSystem as string | undefined,
      sex: req.query.sex as string | undefined,
      isActive:
        typeof req.query.isActive === 'string'
          ? req.query.isActive === 'true'
          : undefined,
      versionTag: req.query.versionTag as string | undefined,
    },
  })

  return res.json({
    data: result.items,
    meta: { total: result.total, page, pageSize },
  })
}

export async function getSetHandler(req: Request, res: Response) {
  const setId = req.params.setId
  const set = await getSet(setId)
  if (!set) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Standard set not found',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
  return res.json({ data: set })
}

const createSetSchema = z.object({
  name: z.string().min(1),
  setType: z.enum(['REFERENCE', 'STANDARD', 'TARGET']),
  standardSchemaCode: z.string().min(1),
  speciesCode: z.string().min(1),
  geneticLineCode: z.string().optional(),
  unitSystem: z.enum(['METRIC', 'IMPERIAL']),
  sex: z.enum(['AS_HATCHED', 'MALE', 'FEMALE', 'MIXED']),
  scope: z.enum(['GLOBAL', 'TENANT', 'FARM', 'HOUSE', 'FLOCK']),
  tenantId: z.string().optional(),
  farmId: z.string().optional(),
  houseId: z.string().optional(),
  flockId: z.string().optional(),
  versionTag: z.string().min(1),
  isActive: z.boolean().optional(),
  dayStart: z.number().int().optional(),
  dayEnd: z.number().int().optional(),
  isDaily: z.boolean().optional(),
  sourceDocument: z
    .object({
      title: z.string().optional(),
      doi: z.string().optional(),
      url: z.string().optional(),
      fileHash: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
})

export async function createSetHandler(req: Request, res: Response) {
  const parsed = createSetSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.message,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const tenantId = getTenantIdFromRequest(res, parsed.data.tenantId)
  const species = await getSpeciesByCode(parsed.data.speciesCode)
  if (!species) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Unknown speciesCode: ${parsed.data.speciesCode}`,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const standardSchema = await getStandardSchemaByCode(parsed.data.standardSchemaCode)
  if (!standardSchema) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Unknown standardSchemaCode: ${parsed.data.standardSchemaCode}`,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const geneticLine = parsed.data.geneticLineCode
    ? await getGeneticLineByCode(parsed.data.geneticLineCode)
    : null
  if (parsed.data.geneticLineCode && !geneticLine) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Unknown geneticLineCode: ${parsed.data.geneticLineCode}`,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const created = await createSet({
    name: parsed.data.name,
    setType: parsed.data.setType,
    unitSystem: parsed.data.unitSystem,
    sex: parsed.data.sex,
    scope: parsed.data.scope,
    tenantId: parsed.data.scope === 'GLOBAL' ? undefined : tenantId || parsed.data.tenantId,
    farmId: parsed.data.farmId,
    houseId: parsed.data.houseId,
    flockId: parsed.data.flockId,
    standardSchemaId: standardSchema.id,
    speciesId: species.id,
    geneticLineId: geneticLine?.id || undefined,
    versionTag: parsed.data.versionTag,
    isActive: parsed.data.isActive,
    dayStart: parsed.data.dayStart,
    dayEnd: parsed.data.dayEnd,
    isDaily: parsed.data.isDaily,
    sourceDocument: parsed.data.sourceDocument,
  })

  return res.status(201).json({ data: created })
}

export async function deleteSetHandler(req: Request, res: Response) {
  const setId = req.params.setId
  const tenantId = getTenantIdFromRequest(res, req.body?.tenantId)

  try {
    await deleteSet(setId, tenantId)

    // Publish RabbitMQ event
    if (tenantId) {
      await publishStandardDeleted(tenantId, setId)
    }

    return res.status(204).send()
  } catch (error: any) {
    logger.error('Failed to delete standard set', { error })
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error?.message || 'Failed to delete standard set',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function exportStandardsHandler(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string | undefined)

  try {
    const standards = await listSets({
      page: 1,
      pageSize: 1000,
      filters: {},
    })

    // Format as JSON for export
    const exportData = {
      tenant_id: tenantId,
      exported_at: new Date().toISOString(),
      count: standards.total,
      standards: standards.items,
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="standards_export_${Date.now()}.json"`)
    return res.json(exportData)
  } catch (error: any) {
    logger.error('Failed to export standards', { error })
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error?.message || 'Failed to export standards',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

const patchSetSchema = z.object({
  name: z.string().min(1).optional(),
  versionTag: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sourceDocument: z
    .object({
      title: z.string().optional(),
      doi: z.string().optional(),
      url: z.string().optional(),
      fileHash: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
})

export async function patchSetHandler(req: Request, res: Response) {
  const setId = req.params.setId
  const parsed = patchSetSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.message,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const tenantId = getTenantIdFromRequest(res, req.body?.tenantId)
  const result = await patchSet(setId, { ...parsed.data }, tenantId)

  return res.json({ data: result })
}

export async function listRowsHandler(req: Request, res: Response) {
  const setId = req.params.setId
  const rows = await listRows(setId, {
    dimType: req.query.dimType as string | undefined,
    from: req.query.from ? Number(req.query.from) : undefined,
    to: req.query.to ? Number(req.query.to) : undefined,
    phase: req.query.phase as string | undefined,
  })
  return res.json({ data: rows })
}

const upsertRowsSchema = z.object({
  rows: z
    .array(
      z.object({
        rowKey: z.string().optional(),
        dimType: z.enum(['AGE_DAY', 'AGE_WEEK', 'BODY_WEIGHT_G', 'PHASE']),
        dimFrom: z.number(),
        dimTo: z.number().optional(),
        phase: z.string().optional(),
        payloadJson: z.record(z.any()),
        note: z.string().optional(),
        isInterpolated: z.boolean().optional(),
      })
    )
    .min(1),
})

export async function upsertRowsHandler(req: Request, res: Response) {
  const setId = req.params.setId
  const parsed = upsertRowsSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.message,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const result = await upsertRows(setId, parsed.data.rows)
  return res.json({ data: result })
}

export async function resolveSetHandler(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  if (!tenantId) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'tenantId is required',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const speciesCode = (req.query.speciesCode as string | undefined) || (req.query.species_code as string | undefined)
  const standardSchemaCode =
    (req.query.standardSchemaCode as string | undefined) || (req.query.standard_schema_code as string | undefined)

  if (!speciesCode || !standardSchemaCode) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'speciesCode and standardSchemaCode are required',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const species = await getSpeciesByCode(speciesCode)
  if (!species) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Unknown speciesCode: ${speciesCode}`,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const standardSchema = await getStandardSchemaByCode(standardSchemaCode)
  if (!standardSchema) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Unknown standardSchemaCode: ${standardSchemaCode}`,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const geneticLineCode =
    (req.query.geneticLineCode as string | undefined) || (req.query.genetic_line_code as string | undefined)
  const geneticLine = geneticLineCode ? await getGeneticLineByCode(geneticLineCode) : null

  const result = await resolveActiveSet({
    tenantId,
    farmId: req.query.farmId as string | undefined,
    houseId: req.query.houseId as string | undefined,
    flockId: req.query.flockId as string | undefined,
    speciesId: species.id,
    geneticLineId: geneticLine?.id || undefined,
    standardSchemaId: standardSchema.id,
    setType: (req.query.setType as any) || undefined,
    unitSystem: req.query.unitSystem as string | undefined,
    sex: req.query.sex as string | undefined,
  })

  return res.json({ data: result })
}

const cloneSetSchema = z.object({
  newSetType: z.enum(['STANDARD', 'TARGET']),
  scope: z.enum(['GLOBAL', 'TENANT', 'FARM', 'HOUSE', 'FLOCK']),
  tenantId: z.string().optional(),
  farmId: z.string().optional(),
  houseId: z.string().optional(),
  flockId: z.string().optional(),
  versionTag: z.string().min(1),
  copyRows: z.boolean().optional().default(true),
})

export async function cloneSetHandler(req: Request, res: Response) {
  const setId = req.params.setId
  const parsed = cloneSetSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.message,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const tenantId = getTenantIdFromRequest(res, parsed.data.tenantId)
  const created = await cloneSet(setId, {
    ...parsed.data,
    tenantId: parsed.data.scope === 'GLOBAL' ? undefined : tenantId || parsed.data.tenantId,
  })

  return res.status(201).json({ data: created })
}

const adjustSetSchema = z.object({
  scope: z.enum(['GLOBAL', 'TENANT', 'FARM', 'HOUSE', 'FLOCK']),
  tenantId: z.string().optional(),
  farmId: z.string().optional(),
  houseId: z.string().optional(),
  flockId: z.string().optional(),
  versionTag: z.string().min(1),
  method: z.enum(['percent', 'offset', 'phase']).default('percent'),
  percent: z.number().optional(),
  offset: z.number().optional(),
  phases: z
    .array(
      z.object({
        from: z.number(),
        to: z.number(),
        percent: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .optional(),
})

export async function adjustSetHandler(req: Request, res: Response) {
  const setId = req.params.setId
  const parsed = adjustSetSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.message,
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const tenantId = getTenantIdFromRequest(res, parsed.data.tenantId)
  const created = await adjustSet(setId, {
    ...parsed.data,
    tenantId: parsed.data.scope === 'GLOBAL' ? undefined : tenantId || parsed.data.tenantId,
  })

  return res.status(201).json({ data: created })
}

export async function importCsvHandler(req: Request, res: Response) {
  try {
    const result = await importCsv(req, res)
    return res.json({ data: result })
  } catch (error: any) {
    logger.error('CSV import failed', { error })
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error?.message || 'CSV import failed',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function getImportJobHandler(req: Request, res: Response) {
  const jobId = req.params.jobId
  const job = await getImportJob(jobId)
  if (!job) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Import job not found',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
  return res.json({ data: job })
}

// ====================
// Catalog endpoints
// ====================

export async function listSpeciesCatalogHandler(_req: Request, res: Response) {
  const items = await listSpeciesCatalog()
  return res.json({ data: items })
}

const upsertSpeciesSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  scientificName: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function upsertSpeciesCatalogHandler(req: Request, res: Response) {
  const parsed = upsertSpeciesSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message, traceId: res.locals.traceId || 'unknown' },
    })
  }
  const item = await upsertSpeciesCatalog(parsed.data)
  return res.status(201).json({ data: item })
}

export async function listBreederCompaniesHandler(_req: Request, res: Response) {
  const items = await listBreederCompanies()
  return res.json({ data: items })
}

const upsertBreederCompanySchema = z.object({
  name: z.string().min(1),
  country: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function upsertBreederCompaniesHandler(req: Request, res: Response) {
  const parsed = upsertBreederCompanySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message, traceId: res.locals.traceId || 'unknown' },
    })
  }
  const item = await upsertBreederCompany(parsed.data)
  return res.status(201).json({ data: item })
}

export async function listGeneticLinesHandler(req: Request, res: Response) {
  const speciesCode = (req.query.speciesCode as string | undefined) || (req.query.species_code as string | undefined)
  const breederCompanyName =
    (req.query.breederCompanyName as string | undefined) || (req.query.breeder_company_name as string | undefined)
  const items = await listGeneticLines({ speciesCode, breederCompanyName })
  return res.json({ data: items })
}

const upsertGeneticLineSchema = z.object({
  speciesCode: z.string().min(1),
  breederCompanyName: z.string().min(1),
  code: z.string().optional(),
  name: z.string().min(1),
  isActive: z.boolean().optional(),
})

export async function upsertGeneticLinesHandler(req: Request, res: Response) {
  const parsed = upsertGeneticLineSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message, traceId: res.locals.traceId || 'unknown' },
    })
  }
  const item = await upsertGeneticLine(parsed.data)
  return res.status(201).json({ data: item })
}

export async function listStandardSchemasHandler(_req: Request, res: Response) {
  const items = await listStandardSchemas()
  return res.json({ data: items })
}

const upsertStandardSchemaSchema = z.object({
  code: z.string().min(1),
  displayName: z.string().min(1),
  dimTypeDefault: z.enum(['AGE_DAY', 'AGE_WEEK', 'BODY_WEIGHT_G', 'PHASE', 'CUSTOM']),
  csvColumnsJson: z.any(),
  payloadSchemaJson: z.any(),
  isActive: z.boolean().optional(),
})

export async function upsertStandardSchemasHandler(req: Request, res: Response) {
  const parsed = upsertStandardSchemaSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message, traceId: res.locals.traceId || 'unknown' },
    })
  }
  const item = await upsertStandardSchema({
    code: parsed.data.code,
    displayName: parsed.data.displayName,
    dimTypeDefault: parsed.data.dimTypeDefault as any,
    csvColumnsJson: parsed.data.csvColumnsJson,
    payloadSchemaJson: parsed.data.payloadSchemaJson,
    isActive: parsed.data.isActive,
  })
  return res.status(201).json({ data: item })
}
