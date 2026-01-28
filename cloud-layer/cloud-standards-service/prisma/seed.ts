import { DimType, PrismaClient, Scope, SetType, Sex, UnitSystem } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PROD) {
    throw new Error('Seed not allowed in production (set ALLOW_SEED_IN_PROD=true)')
  }

  const chicken = await prisma.speciesCatalog.upsert({
    where: { code: 'chicken' },
    create: { code: 'chicken', name: 'Chicken', scientificName: 'Gallus gallus domesticus', isActive: true },
    update: { name: 'Chicken', scientificName: 'Gallus gallus domesticus', isActive: true },
  })

  const cobb = await prisma.breederCompany.upsert({
    where: { name: 'Cobb' },
    create: { name: 'Cobb', country: 'US', isActive: true },
    update: { country: 'US', isActive: true },
  })

  await prisma.geneticLineCatalog.upsert({
    where: { code: 'COBB500' },
    create: {
      code: 'COBB500',
      name: 'Cobb 500',
      speciesId: chicken.id,
      breederCompanyId: cobb.id,
      isActive: true,
    },
    update: {
      name: 'Cobb 500',
      speciesId: chicken.id,
      breederCompanyId: cobb.id,
      isActive: true,
    },
  })

  // Default schema registry (data-driven)
  await prisma.standardSchema.upsert({
    where: { code: 'GROWTH' },
    create: {
      code: 'GROWTH',
      displayName: 'Growth Standard',
      dimTypeDefault: DimType.AGE_DAY,
      csvColumnsJson: {
        dimColumn: 'age_day',
        required: [
          'age_day',
          'body_weight_g',
          'daily_gain_g',
          'avg_daily_gain_g',
          'daily_feed_intake_g',
          'cum_feed_intake_g',
          'fcr',
          'cum_fcr',
        ],
        optional: [],
      },
      payloadSchemaJson: {
        type: 'object',
        required: [
          'body_weight_g',
          'daily_gain_g',
          'avg_daily_gain_g',
          'daily_feed_intake_g',
          'cum_feed_intake_g',
          'fcr',
          'cum_fcr',
        ],
        properties: {
          body_weight_g: { type: 'number' },
          daily_gain_g: { type: 'number' },
          avg_daily_gain_g: { type: 'number' },
          daily_feed_intake_g: { type: 'number' },
          cum_feed_intake_g: { type: 'number' },
          fcr: { type: 'number' },
          cum_fcr: { type: 'number' },
        },
      },
      isActive: true,
    },
    update: { isActive: true },
  })

  await prisma.standardSchema.upsert({
    where: { code: 'VENTILATION' },
    create: {
      code: 'VENTILATION',
      displayName: 'Ventilation Standard',
      dimTypeDefault: DimType.AGE_WEEK,
      csvColumnsJson: {
        dimColumn: 'age_week',
        required: ['age_week', 'avg_body_weight_g', 'min_vent_m3_per_kg_hr_for_5000'],
        optional: [],
      },
      payloadSchemaJson: {
        type: 'object',
        required: ['avg_body_weight_g', 'min_vent_m3_per_kg_hr_for_5000'],
        properties: {
          avg_body_weight_g: { type: 'number' },
          min_vent_m3_per_kg_hr_for_5000: { type: 'number' },
        },
      },
      isActive: true,
    },
    update: { isActive: true },
  })

  await prisma.standardSchema.upsert({
    where: { code: 'LIGHTING' },
    create: {
      code: 'LIGHTING',
      displayName: 'Lighting Program',
      dimTypeDefault: DimType.AGE_DAY,
      csvColumnsJson: { dimColumn: 'age_day', required: ['age_day', 'hours_light', 'lux'], optional: [] },
      payloadSchemaJson: {
        type: 'object',
        required: ['hours_light', 'lux'],
        properties: { hours_light: { type: 'number' }, lux: { type: 'number' } },
      },
      isActive: true,
    },
    update: { isActive: true },
  })

  await prisma.standardSchema.upsert({
    where: { code: 'ENV_LIMITS' },
    create: {
      code: 'ENV_LIMITS',
      displayName: 'Environmental Limits',
      dimTypeDefault: DimType.PHASE,
      csvColumnsJson: {
        dimColumn: 'phase',
        required: [
          'phase',
          'temp_c_min',
          'temp_c_max',
          'humidity_pct_min',
          'humidity_pct_max',
          'o2_pct_min',
          'co2_pct_max_pct',
          'co_ppm_max',
          'nh3_ppm_max',
          'dust_mg_m3_max',
        ],
        optional: [],
      },
      payloadSchemaJson: {
        type: 'object',
        required: [
          'temp_c_min',
          'temp_c_max',
          'humidity_pct_min',
          'humidity_pct_max',
          'o2_pct_min',
          'co2_pct_max_pct',
          'co_ppm_max',
          'nh3_ppm_max',
          'dust_mg_m3_max',
        ],
        properties: {
          temp_c_min: { type: 'number' },
          temp_c_max: { type: 'number' },
          humidity_pct_min: { type: 'number' },
          humidity_pct_max: { type: 'number' },
          o2_pct_min: { type: 'number' },
          co2_pct_max_pct: { type: 'number' },
          co_ppm_max: { type: 'number' },
          nh3_ppm_max: { type: 'number' },
          dust_mg_m3_max: { type: 'number' },
        },
      },
      isActive: true,
    },
    update: { isActive: true },
  })

  // Reference dataset: C500 Broiler Performance Objectives (Metric) - As Hatched
  const growthSchema = await prisma.standardSchema.findUnique({ where: { code: 'GROWTH' } })
  if (!growthSchema) throw new Error('Missing StandardSchema: GROWTH')

  const cobb500 = await prisma.geneticLineCatalog.findUnique({ where: { code: 'COBB500' } })
  if (!cobb500) throw new Error('Missing GeneticLineCatalog: COBB500')

  const sourceTitle = 'Cobb 500 Broiler Performance Objectives (Metric) - As Hatched (2022 supplement)'
  const existingDoc = await prisma.sourceDocument.findFirst({ where: { title: sourceTitle } })
  const sourceDoc = existingDoc
    ? await prisma.sourceDocument.update({
        where: { id: existingDoc.id },
        data: {
          title: sourceTitle,
          note: 'Seeded from docs/master_data/Broiler/2022-Cobb500-Broiler-Performance-Nutrition-Supplement.pdf',
        },
      })
    : await prisma.sourceDocument.create({
        data: {
          title: sourceTitle,
          note: 'Seeded from docs/master_data/Broiler/2022-Cobb500-Broiler-Performance-Nutrition-Supplement.pdf',
        },
      })

  const setName = 'C500_BROILER_AS_HATCHED_METRIC'
  const versionTag = 'v1'

  const existingSet = await prisma.standardSet.findFirst({
    where: {
      name: setName,
      versionTag,
      setType: SetType.REFERENCE,
      unitSystem: UnitSystem.METRIC,
      sex: Sex.AS_HATCHED,
      scope: Scope.GLOBAL,
      speciesId: chicken.id,
      geneticLineId: cobb500.id,
      standardSchemaId: growthSchema.id,
    },
  })

  const standardSet = existingSet
    ? await prisma.standardSet.update({
        where: { id: existingSet.id },
        data: {
          isActive: true,
          dayStart: 0,
          dayEnd: 56,
          isDaily: true,
          sourceDocumentId: sourceDoc.id,
        },
      })
    : await prisma.standardSet.create({
        data: {
          name: setName,
          setType: SetType.REFERENCE,
          unitSystem: UnitSystem.METRIC,
          sex: Sex.AS_HATCHED,
          scope: Scope.GLOBAL,
          speciesId: chicken.id,
          geneticLineId: cobb500.id,
          standardSchemaId: growthSchema.id,
          versionTag,
          isActive: true,
          dayStart: 0,
          dayEnd: 56,
          isDaily: true,
          sourceDocumentId: sourceDoc.id,
        },
      })

  const points = [
    { age_day: 0, body_weight_g: 42, daily_gain_g: null, avg_daily_gain_g: null, daily_feed_intake_g: null, cum_feed_intake_g: null, fcr: null, cum_fcr: null },
    { age_day: 1, body_weight_g: 55, daily_gain_g: 13, avg_daily_gain_g: 13.0, daily_feed_intake_g: null, cum_feed_intake_g: null, fcr: null, cum_fcr: null },
    { age_day: 2, body_weight_g: 71, daily_gain_g: 16, avg_daily_gain_g: 14.5, daily_feed_intake_g: null, cum_feed_intake_g: null, fcr: null, cum_fcr: null },
    { age_day: 3, body_weight_g: 90, daily_gain_g: 19, avg_daily_gain_g: 16.0, daily_feed_intake_g: null, cum_feed_intake_g: null, fcr: null, cum_fcr: null },
    { age_day: 4, body_weight_g: 112, daily_gain_g: 22, avg_daily_gain_g: 17.5, daily_feed_intake_g: null, cum_feed_intake_g: null, fcr: null, cum_fcr: null },
    { age_day: 7, body_weight_g: 202, daily_gain_g: 34, avg_daily_gain_g: 22.86, daily_feed_intake_g: null, cum_feed_intake_g: 180, fcr: null, cum_fcr: 1.125 },
    { age_day: 8, body_weight_g: 240, daily_gain_g: 38, avg_daily_gain_g: 24.75, daily_feed_intake_g: 40, cum_feed_intake_g: 220, fcr: 1.053, cum_fcr: 1.111 },
    { age_day: 10, body_weight_g: 330, daily_gain_g: 47, avg_daily_gain_g: 28.8, daily_feed_intake_g: 50, cum_feed_intake_g: 314, fcr: 1.064, cum_fcr: 1.09 },
    { age_day: 14, body_weight_g: 570, daily_gain_g: 67, avg_daily_gain_g: 37.71, daily_feed_intake_g: 80, cum_feed_intake_g: 588, fcr: 1.194, cum_fcr: 1.114 },
    { age_day: 21, body_weight_g: 1116, daily_gain_g: 87, avg_daily_gain_g: 51.14, daily_feed_intake_g: 125, cum_feed_intake_g: 1320, fcr: 1.437, cum_fcr: 1.229 },
    { age_day: 28, body_weight_g: 1783, daily_gain_g: 101, avg_daily_gain_g: 62.18, daily_feed_intake_g: 165, cum_feed_intake_g: 2359, fcr: 1.634, cum_fcr: 1.355 },
    { age_day: 35, body_weight_g: 2521, daily_gain_g: 108, avg_daily_gain_g: 70.83, daily_feed_intake_g: 194, cum_feed_intake_g: 3635, fcr: 1.796, cum_fcr: 1.466 },
    { age_day: 42, body_weight_g: 3278, daily_gain_g: 108, avg_daily_gain_g: 77.05, daily_feed_intake_g: 220, cum_feed_intake_g: 5100, fcr: 2.037, cum_fcr: 1.576 },
    { age_day: 49, body_weight_g: 4001, daily_gain_g: 99, avg_daily_gain_g: 80.8, daily_feed_intake_g: 247, cum_feed_intake_g: 6749, fcr: 2.495, cum_fcr: 1.705 },
    { age_day: 56, body_weight_g: 4641, daily_gain_g: 84, avg_daily_gain_g: 82.12, daily_feed_intake_g: 262, cum_feed_intake_g: 8549, fcr: 3.119, cum_fcr: 1.859 },
  ] as const

  for (const p of points) {
    const rowKey = `age_day:${p.age_day}`
    await prisma.standardRow.upsert({
      where: { setId_rowKey: { setId: standardSet.id, rowKey } },
      create: {
        setId: standardSet.id,
        rowKey,
        dimType: DimType.AGE_DAY,
        dimFrom: p.age_day,
        payloadJson: {
          body_weight_g: p.body_weight_g,
          daily_gain_g: p.daily_gain_g,
          avg_daily_gain_g: p.avg_daily_gain_g,
          daily_feed_intake_g: p.daily_feed_intake_g,
          cum_feed_intake_g: p.cum_feed_intake_g,
          fcr: p.fcr,
          cum_fcr: p.cum_fcr,
        },
        note: 'Seed: Cobb 500 metric objectives (as-hatched)',
      },
      update: {
        dimFrom: p.age_day,
        payloadJson: {
          body_weight_g: p.body_weight_g,
          daily_gain_g: p.daily_gain_g,
          avg_daily_gain_g: p.avg_daily_gain_g,
          daily_feed_intake_g: p.daily_feed_intake_g,
          cum_feed_intake_g: p.cum_feed_intake_g,
          fcr: p.fcr,
          cum_fcr: p.cum_fcr,
        },
      },
    })
  }
}

main()
  .catch((e) => {
    console.error('Error during seed:')
    if (e instanceof Error) {
      console.error('  Message:', e.message)
      console.error('  Code:', (e as any).code || 'N/A')
      console.error('  Meta:', JSON.stringify((e as any).meta || {}, null, 2))
      if (e.stack) {
        console.error('  Stack:', e.stack)
      }
    } else {
      console.error('  Error object:', JSON.stringify(e, null, 2))
    }
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
