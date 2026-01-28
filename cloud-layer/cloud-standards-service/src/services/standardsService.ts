import { Prisma, SetType, Scope, UnitSystem, Sex, DimType } from '@prisma/client'
import { prisma } from './db'
import { logger } from '../utils/logger'

export async function listSpeciesCatalog() {
  return prisma.speciesCatalog.findMany({ orderBy: [{ name: 'asc' }] })
}

export async function upsertSpeciesCatalog(input: {
  code: string
  name: string
  scientificName?: string
  isActive?: boolean
}) {
  return prisma.speciesCatalog.upsert({
    where: { code: input.code },
    create: {
      code: input.code,
      name: input.name,
      scientificName: input.scientificName || null,
      isActive: input.isActive ?? true,
    },
    update: {
      name: input.name,
      scientificName: input.scientificName || null,
      isActive: input.isActive ?? true,
    },
  })
}

export async function listBreederCompanies() {
  return prisma.breederCompany.findMany({ orderBy: [{ name: 'asc' }] })
}

export async function upsertBreederCompany(input: {
  name: string
  country?: string
  isActive?: boolean
}) {
  return prisma.breederCompany.upsert({
    where: { name: input.name },
    create: {
      name: input.name,
      country: input.country || null,
      isActive: input.isActive ?? true,
    },
    update: {
      country: input.country || null,
      isActive: input.isActive ?? true,
    },
  })
}

export async function listGeneticLines(params?: { speciesCode?: string; breederCompanyName?: string }) {
  const where: Prisma.GeneticLineCatalogWhereInput = {}
  if (params?.speciesCode) {
    const species = await prisma.speciesCatalog.findUnique({ where: { code: params.speciesCode } })
    if (!species) return []
    where.speciesId = species.id
  }
  if (params?.breederCompanyName) {
    const company = await prisma.breederCompany.findUnique({ where: { name: params.breederCompanyName } })
    if (!company) return []
    where.breederCompanyId = company.id
  }
  return prisma.geneticLineCatalog.findMany({
    where,
    include: { breederCompany: true, species: true },
    orderBy: [{ name: 'asc' }],
  })
}

export async function upsertGeneticLine(input: {
  speciesCode: string
  breederCompanyName: string
  code?: string
  name: string
  isActive?: boolean
}) {
  const species = await prisma.speciesCatalog.findUnique({ where: { code: input.speciesCode } })
  if (!species) throw new Error(`Unknown speciesCode: ${input.speciesCode}`)

  const company = await prisma.breederCompany.findUnique({ where: { name: input.breederCompanyName } })
  if (!company) throw new Error(`Unknown breederCompanyName: ${input.breederCompanyName}`)

  if (input.code) {
    return prisma.geneticLineCatalog.upsert({
      where: { code: input.code },
      create: {
        code: input.code,
        name: input.name,
        speciesId: species.id,
        breederCompanyId: company.id,
        isActive: input.isActive ?? true,
      },
      update: {
        name: input.name,
        speciesId: species.id,
        breederCompanyId: company.id,
        isActive: input.isActive ?? true,
      },
      include: { breederCompany: true, species: true },
    })
  }

  // Fallback: upsert by (breederCompanyId, name)
  const existing = await prisma.geneticLineCatalog.findFirst({
    where: { breederCompanyId: company.id, name: input.name },
  })
  if (existing) {
    return prisma.geneticLineCatalog.update({
      where: { id: existing.id },
      data: { speciesId: species.id, isActive: input.isActive ?? existing.isActive },
      include: { breederCompany: true, species: true },
    })
  }
  return prisma.geneticLineCatalog.create({
    data: {
      code: null,
      name: input.name,
      speciesId: species.id,
      breederCompanyId: company.id,
      isActive: input.isActive ?? true,
    },
    include: { breederCompany: true, species: true },
  })
}

export async function listStandardSchemas() {
  return prisma.standardSchema.findMany({ orderBy: [{ displayName: 'asc' }] })
}

export async function upsertStandardSchema(input: {
  code: string
  displayName: string
  dimTypeDefault: DimType
  csvColumnsJson: unknown
  payloadSchemaJson: unknown
  isActive?: boolean
}) {
  return prisma.standardSchema.upsert({
    where: { code: input.code },
    create: {
      code: input.code,
      displayName: input.displayName,
      dimTypeDefault: input.dimTypeDefault,
      csvColumnsJson: input.csvColumnsJson as Prisma.InputJsonValue,
      payloadSchemaJson: input.payloadSchemaJson as Prisma.InputJsonValue,
      isActive: input.isActive ?? true,
    },
    update: {
      displayName: input.displayName,
      dimTypeDefault: input.dimTypeDefault,
      csvColumnsJson: input.csvColumnsJson as Prisma.InputJsonValue,
      payloadSchemaJson: input.payloadSchemaJson as Prisma.InputJsonValue,
      isActive: input.isActive ?? true,
    },
  })
}

export async function getSpeciesByCode(code: string) {
  return prisma.speciesCatalog.findUnique({ where: { code } })
}

export async function getGeneticLineByCode(code: string) {
  return prisma.geneticLineCatalog.findUnique({ where: { code } })
}

export async function getStandardSchemaByCode(code: string) {
  return prisma.standardSchema.findUnique({ where: { code } })
}

export async function listSets(params: {
  page: number
  pageSize: number
  filters: {
    speciesId?: string
    geneticLineId?: string
    standardSchemaId?: string
    setType?: string
    scope?: string
    unitSystem?: string
    sex?: string
    isActive?: boolean
    versionTag?: string
  }
}) {
  const where: Prisma.StandardSetWhereInput = {}

  if (params.filters.speciesId) where.speciesId = params.filters.speciesId
  if (params.filters.geneticLineId) where.geneticLineId = params.filters.geneticLineId
  if (params.filters.standardSchemaId) where.standardSchemaId = params.filters.standardSchemaId
  if (params.filters.setType) where.setType = params.filters.setType as SetType
  if (params.filters.scope) where.scope = params.filters.scope as Scope
  if (params.filters.unitSystem) where.unitSystem = params.filters.unitSystem as UnitSystem
  if (params.filters.sex) where.sex = params.filters.sex as Sex
  if (typeof params.filters.isActive === 'boolean') where.isActive = params.filters.isActive
  if (params.filters.versionTag) where.versionTag = params.filters.versionTag

  const skip = (params.page - 1) * params.pageSize

  const [total, items] = await Promise.all([
    prisma.standardSet.count({ where }),
    prisma.standardSet.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      skip,
      take: params.pageSize,
      include: { sourceDocument: true, species: true, geneticLine: true, standardSchema: true },
    }),
  ])

  return { total, items }
}

export async function getSet(setId: string) {
  return prisma.standardSet.findUnique({
    where: { id: setId },
    include: { sourceDocument: true, species: true, geneticLine: true, standardSchema: true },
  })
}

export async function createSet(input: {
  name: string
  setType: 'REFERENCE' | 'STANDARD' | 'TARGET'
  standardSchemaId: string
  unitSystem: 'METRIC' | 'IMPERIAL'
  sex: 'AS_HATCHED' | 'MALE' | 'FEMALE' | 'MIXED'
  scope: 'GLOBAL' | 'TENANT' | 'FARM' | 'HOUSE' | 'FLOCK'
  tenantId?: string
  farmId?: string
  houseId?: string
  flockId?: string
  speciesId: string
  geneticLineId?: string
  versionTag: string
  isActive?: boolean
  dayStart?: number
  dayEnd?: number
  isDaily?: boolean
  sourceDocument?: {
    title?: string
    doi?: string
    url?: string
    fileHash?: string
    note?: string
  }
}) {
  const sourceDocumentId = input.sourceDocument
    ? (
        await prisma.sourceDocument.create({
          data: {
            title: input.sourceDocument.title,
            doi: input.sourceDocument.doi,
            url: input.sourceDocument.url,
            fileHash: input.sourceDocument.fileHash,
            note: input.sourceDocument.note,
          },
        })
      ).id
    : undefined

  return prisma.standardSet.create({
    data: {
      name: input.name,
      setType: input.setType as SetType,
      standardSchemaId: input.standardSchemaId,
      unitSystem: input.unitSystem as UnitSystem,
      sex: input.sex as Sex,
      scope: input.scope as Scope,
      tenantId: input.tenantId || null,
      farmId: input.farmId || null,
      houseId: input.houseId || null,
      flockId: input.flockId || null,
      speciesId: input.speciesId,
      geneticLineId: input.geneticLineId || null,
      versionTag: input.versionTag,
      isActive: input.isActive ?? false,
      dayStart: input.dayStart ?? null,
      dayEnd: input.dayEnd ?? null,
      isDaily: input.isDaily ?? true,
      sourceDocumentId: sourceDocumentId || null,
    },
    include: { sourceDocument: true, species: true, geneticLine: true, standardSchema: true },
  })
}

export async function patchSet(
  setId: string,
  input: {
    name?: string
    versionTag?: string
    isActive?: boolean
    sourceDocument?: { title?: string; doi?: string; url?: string; fileHash?: string; note?: string }
  },
  tenantId: string | null
) {
  const existing = await prisma.standardSet.findUnique({ where: { id: setId } })
  if (!existing) {
    throw new Error('Standard set not found')
  }

  if (existing.scope !== 'GLOBAL' && tenantId && existing.tenantId && existing.tenantId !== tenantId) {
    logger.warn('Tenant mismatch updating standard set', { setId, tenantId })
  }

  let sourceDocumentId = existing.sourceDocumentId
  if (input.sourceDocument) {
    if (existing.sourceDocumentId) {
      await prisma.sourceDocument.update({
        where: { id: existing.sourceDocumentId },
        data: {
          title: input.sourceDocument.title,
          doi: input.sourceDocument.doi,
          url: input.sourceDocument.url,
          fileHash: input.sourceDocument.fileHash,
          note: input.sourceDocument.note,
        },
      })
    } else {
      sourceDocumentId = (
        await prisma.sourceDocument.create({
          data: {
            title: input.sourceDocument.title,
            doi: input.sourceDocument.doi,
            url: input.sourceDocument.url,
            fileHash: input.sourceDocument.fileHash,
            note: input.sourceDocument.note,
          },
        })
      ).id
    }
  }

  // If activating, deactivate other active sets in same scope/keys
  if (input.isActive === true) {
    await prisma.standardSet.updateMany({
      where: {
        id: { not: setId },
        isActive: true,
        setType: existing.setType,
        standardSchemaId: existing.standardSchemaId,
        unitSystem: existing.unitSystem,
        sex: existing.sex,
        scope: existing.scope,
        tenantId: existing.tenantId,
        farmId: existing.farmId,
        houseId: existing.houseId,
        flockId: existing.flockId,
        speciesId: existing.speciesId,
        geneticLineId: existing.geneticLineId,
      },
      data: { isActive: false },
    })
  }

  return prisma.standardSet.update({
    where: { id: setId },
    data: {
      name: input.name,
      versionTag: input.versionTag,
      isActive: typeof input.isActive === 'boolean' ? input.isActive : undefined,
      sourceDocumentId,
    },
    include: { sourceDocument: true, species: true, geneticLine: true, standardSchema: true },
  })
}

export async function listRows(
  setId: string,
  filters: { dimType?: string; from?: number; to?: number; phase?: string }
) {
  const where: Prisma.StandardRowWhereInput = { setId }
  if (filters.dimType) where.dimType = filters.dimType as DimType
  if (typeof filters.from === 'number') where.dimFrom = { gte: filters.from }
  if (typeof filters.to === 'number') where.dimFrom = { ...(where.dimFrom as any), lte: filters.to }
  if (filters.phase) where.phase = filters.phase

  return prisma.standardRow.findMany({
    where,
    orderBy: [{ dimFrom: 'asc' }],
  })
}

function computeRowKey(row: {
  rowKey?: string
  dimType: DimType
  dimFrom: number
  dimTo?: number
  phase?: string
}) {
  if (row.rowKey) return row.rowKey
  const dimTo = typeof row.dimTo === 'number' ? row.dimTo : ''
  const phase = row.phase || ''
  return `${row.dimType}:${row.dimFrom}:${dimTo}:${phase}`
}

export async function upsertRows(
  setId: string,
  rows: Array<{
    rowKey?: string
    dimType: 'AGE_DAY' | 'AGE_WEEK' | 'BODY_WEIGHT_G' | 'PHASE'
    dimFrom: number
    dimTo?: number
    phase?: string
    payloadJson: Record<string, unknown>
    note?: string
    isInterpolated?: boolean
  }>
) {
  const now = new Date()

  const operations = rows.map((row) => {
    const dimType = row.dimType as DimType
    const rowKey = computeRowKey({
      rowKey: row.rowKey,
      dimType,
      dimFrom: row.dimFrom,
      dimTo: row.dimTo,
      phase: row.phase,
    })

    return prisma.standardRow.upsert({
      where: { setId_rowKey: { setId, rowKey } },
      create: {
        setId,
        rowKey,
        dimType,
        dimFrom: row.dimFrom,
        dimTo: row.dimTo ?? null,
        phase: row.phase ?? null,
        payloadJson: row.payloadJson as Prisma.InputJsonValue,
        isInterpolated: row.isInterpolated ?? false,
        note: row.note ?? null,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        dimType,
        dimFrom: row.dimFrom,
        dimTo: row.dimTo ?? null,
        phase: row.phase ?? null,
        payloadJson: row.payloadJson as Prisma.InputJsonValue,
        isInterpolated: row.isInterpolated ?? false,
        note: row.note ?? null,
        updatedAt: now,
      },
    })
  })

  return prisma.$transaction(operations)
}

export type ResolveActiveSetResult = {
  resolvedSetId: string | null
  scopeUsed: Scope | null
  versionTag: string | null
  setType: SetType | null
}

export async function resolveActiveSet(params: {
  tenantId: string
  farmId?: string
  houseId?: string
  flockId?: string
  speciesId: string
  geneticLineId?: string
  standardSchemaId: string
  setType?: SetType
  unitSystem?: string
  sex?: string
}): Promise<ResolveActiveSetResult> {
  const commonWhere: Prisma.StandardSetWhereInput = {
    isActive: true,
    standardSchemaId: params.standardSchemaId,
    speciesId: params.speciesId,
  }
  if (params.setType) commonWhere.setType = params.setType
  if (params.unitSystem) commonWhere.unitSystem = params.unitSystem as UnitSystem
  if (params.sex) commonWhere.sex = params.sex as Sex
  if (params.geneticLineId) commonWhere.geneticLineId = params.geneticLineId

  const candidates: Array<{ scope: Scope; where: Prisma.StandardSetWhereInput }> = [
    {
      scope: 'FLOCK',
      where: { ...commonWhere, scope: 'FLOCK', tenantId: params.tenantId, flockId: params.flockId || '__none__' },
    },
    {
      scope: 'HOUSE',
      where: { ...commonWhere, scope: 'HOUSE', tenantId: params.tenantId, houseId: params.houseId || '__none__' },
    },
    {
      scope: 'FARM',
      where: { ...commonWhere, scope: 'FARM', tenantId: params.tenantId, farmId: params.farmId || '__none__' },
    },
    { scope: 'TENANT', where: { ...commonWhere, scope: 'TENANT', tenantId: params.tenantId } },
    { scope: 'GLOBAL', where: { ...commonWhere, scope: 'GLOBAL' } },
  ]

  for (const c of candidates) {
    const set = await prisma.standardSet.findFirst({
      where: c.where,
      orderBy: [{ updatedAt: 'desc' }],
    })
    if (set) {
      return { resolvedSetId: set.id, scopeUsed: c.scope, versionTag: set.versionTag, setType: set.setType }
    }
  }

  // If genetic line is specified but no set found, retry with generic species-level (geneticLineId = null)
  if (params.geneticLineId) {
    const retry: ResolveActiveSetResult = await resolveActiveSet({ ...params, geneticLineId: undefined })
    if (retry.resolvedSetId) return retry
  }

  return { resolvedSetId: null, scopeUsed: null, versionTag: null, setType: null }
}

export async function cloneSet(
  sourceSetId: string,
  input: {
    newSetType: 'STANDARD' | 'TARGET'
    scope: 'GLOBAL' | 'TENANT' | 'FARM' | 'HOUSE' | 'FLOCK'
    tenantId?: string
    farmId?: string
    houseId?: string
    flockId?: string
    versionTag: string
    copyRows: boolean
  }
) {
  const source = await prisma.standardSet.findUnique({ where: { id: sourceSetId } })
  if (!source) throw new Error('Source set not found')

  return prisma.$transaction(async (tx) => {
    const created = await tx.standardSet.create({
      data: {
        name: `${source.name} (clone)`,
        setType: input.newSetType as SetType,
        standardSchemaId: source.standardSchemaId,
        unitSystem: source.unitSystem,
        sex: source.sex,
        scope: input.scope as Scope,
        tenantId: input.tenantId || null,
        farmId: input.farmId || null,
        houseId: input.houseId || null,
        flockId: input.flockId || null,
        speciesId: source.speciesId,
        geneticLineId: source.geneticLineId,
        versionTag: input.versionTag,
        isActive: false,
        derivedFromSetId: source.id,
        sourceDocumentId: source.sourceDocumentId,
        dayStart: source.dayStart,
        dayEnd: source.dayEnd,
        isDaily: source.isDaily,
      },
    })

    if (input.copyRows) {
      const rows = await tx.standardRow.findMany({ where: { setId: source.id } })
      if (rows.length) {
        await tx.standardRow.createMany({
          data: rows.map((r) => ({
            setId: created.id,
            rowKey: r.rowKey,
            dimType: r.dimType,
            dimFrom: r.dimFrom,
            dimTo: r.dimTo,
            phase: r.phase,
            payloadJson: r.payloadJson as Prisma.InputJsonValue,
            isInterpolated: r.isInterpolated,
            note: r.note,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        })
      }
    }

    return created
  })
}

function adjustPayload(payload: Record<string, unknown>, factor: number, offset: number) {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value * factor + offset
    } else {
      out[key] = value
    }
  }
  return out
}

export async function adjustSet(
  sourceSetId: string,
  input: {
    scope: 'GLOBAL' | 'TENANT' | 'FARM' | 'HOUSE' | 'FLOCK'
    tenantId?: string
    farmId?: string
    houseId?: string
    flockId?: string
    versionTag: string
    method: 'percent' | 'offset' | 'phase'
    percent?: number
    offset?: number
    phases?: Array<{ from: number; to: number; percent?: number; offset?: number }>
  }
) {
  const source = await prisma.standardSet.findUnique({ where: { id: sourceSetId } })
  if (!source) throw new Error('Source set not found')

  const rows = await prisma.standardRow.findMany({ where: { setId: source.id } })

  const method = input.method
  const baseFactor = method === 'percent' ? 1 + (input.percent || 0) : 1
  const baseOffset = method === 'offset' ? input.offset || 0 : 0

  const adjustedRows = rows.map((r) => {
    const payload = r.payloadJson as unknown as Record<string, unknown>

    if (method === 'phase' && input.phases?.length) {
      const phase = input.phases.find((p) => r.dimFrom >= p.from && r.dimFrom <= p.to)
      const factor = 1 + (phase?.percent || 0)
      const offset = phase?.offset || 0
      return { ...r, payloadJson: adjustPayload(payload, factor, offset) }
    }

    return { ...r, payloadJson: adjustPayload(payload, baseFactor, baseOffset) }
  })

  return prisma.$transaction(async (tx) => {
    const created = await tx.standardSet.create({
      data: {
        name: `${source.name} (adjusted)`,
        setType: 'TARGET',
        standardSchemaId: source.standardSchemaId,
        unitSystem: source.unitSystem,
        sex: source.sex,
        scope: input.scope as Scope,
        tenantId: input.tenantId || null,
        farmId: input.farmId || null,
        houseId: input.houseId || null,
        flockId: input.flockId || null,
        speciesId: source.speciesId,
        geneticLineId: source.geneticLineId,
        versionTag: input.versionTag,
        isActive: false,
        derivedFromSetId: source.id,
        adjustmentJson: input as unknown as Prisma.InputJsonValue,
        sourceDocumentId: source.sourceDocumentId,
        dayStart: source.dayStart,
        dayEnd: source.dayEnd,
        isDaily: source.isDaily,
      },
    })

    if (adjustedRows.length) {
      await tx.standardRow.createMany({
        data: adjustedRows.map((r) => ({
          setId: created.id,
          rowKey: r.rowKey,
          dimType: r.dimType,
          dimFrom: r.dimFrom,
          dimTo: r.dimTo,
          phase: r.phase,
          payloadJson: r.payloadJson as unknown as Prisma.InputJsonValue,
          isInterpolated: r.isInterpolated,
          note: r.note,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      })
    }

    return created
  })
}

export async function getImportJob(jobId: string) {
  return prisma.importJob.findUnique({
    where: { id: jobId },
    include: { errors: true, set: true },
  })
}

export async function deleteSet(setId: string, tenantId: string | null) {
  const existing = await prisma.standardSet.findUnique({ where: { id: setId } })
  if (!existing) {
    throw new Error('Standard set not found')
  }

  // Check tenant access
  if (existing.scope !== 'GLOBAL' && tenantId && existing.tenantId && existing.tenantId !== tenantId) {
    throw new Error('Access denied: tenant mismatch')
  }

  await prisma.standardSet.delete({ where: { id: setId } })
}

export async function createImportJob(params: {
  status: 'DRAFT' | 'VALIDATED' | 'COMMITTED' | 'FAILED'
  filename: string
  fileHash?: string
  uploadedBy?: string
  dryRun: boolean
  setId?: string
  summaryJson?: Prisma.InputJsonValue
  errorJson?: Prisma.InputJsonValue
}) {
  return prisma.importJob.create({
    data: {
      status: params.status,
      filename: params.filename,
      fileHash: params.fileHash || null,
      uploadedBy: params.uploadedBy || null,
      dryRun: params.dryRun,
      setId: params.setId || null,
      summaryJson: params.summaryJson ?? undefined,
      errorJson: params.errorJson ?? undefined,
    },
    include: { errors: true },
  })
}
