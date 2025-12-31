import { PrismaClient, Prisma } from '@prisma/client'
import { ensureMediaSchema } from '../src/db/ensureSchema'

const prisma = new PrismaClient()

async function main() {
  // Guard: prevent seed in production
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PROD) {
    console.error('ERROR: Seed is not allowed in production!')
    console.error('Set ALLOW_SEED_IN_PROD=true if you really want to seed production.')
    process.exit(1)
  }

  const SEED_COUNT = parseInt(process.env.SEED_COUNT || '60', 10)
  const count = Math.max(30, SEED_COUNT)
  const tenants = ['t-001', 't-002']
  const now = Date.now()

  await prisma.$connect()
  await ensureMediaSchema(prisma)

  const rows = Array.from({ length: count }, (_, i) => {
    const tenantId = tenants[i % tenants.length]
    const farmId = tenantId === 't-001' ? 'f-001' : 'f-101'
    const barnId = tenantId === 't-001' ? 'b-001' : 'b-101'
    const deviceId = tenantId === 't-001' ? 'd-001' : 'd-101'
    const sessionId = i % 4 === 0 ? `session-${(i / 4).toString().padStart(4, '0')}` : null
    const day = ((i % 28) + 1).toString().padStart(2, '0')

    return {
      tenantId,
      farmId,
      barnId,
      deviceId,
      sessionId,
      bucket: 'farmiq-media',
      objectKey: `tenants/${tenantId}/farms/${farmId}/barns/${barnId}/devices/${deviceId}/images/2025-12-${day}/img-${i
        .toString()
        .padStart(6, '0')}.jpg`,
      etag: `etag-${i.toString().padStart(6, '0')}`,
      mimeType: 'image/jpeg',
      sizeBytes: 1024 + i,
      capturedAt: new Date(now - i * 60_000),
    }
  })

  const values = rows.map((r) =>
    Prisma.sql`(${r.tenantId}, ${r.farmId}, ${r.barnId}, ${r.deviceId}, ${r.sessionId}, ${r.bucket}, ${r.objectKey}, ${r.etag}, ${r.mimeType}, ${r.sizeBytes}, ${r.capturedAt})`
  )

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO media_objects
        (tenant_id, farm_id, barn_id, device_id, session_id, bucket, object_key, etag, mime_type, size_bytes, captured_at)
      VALUES
        ${Prisma.join(values)}
      ON CONFLICT (tenant_id, object_key)
      DO UPDATE SET
        farm_id = EXCLUDED.farm_id,
        barn_id = EXCLUDED.barn_id,
        device_id = EXCLUDED.device_id,
        session_id = EXCLUDED.session_id,
        bucket = EXCLUDED.bucket,
        etag = EXCLUDED.etag,
        mime_type = EXCLUDED.mime_type,
        size_bytes = EXCLUDED.size_bytes,
        captured_at = EXCLUDED.captured_at
    `
  )

  console.log(`Upserted ${rows.length} media_objects rows`)
}

main()
  .catch((error) => {
    console.error('Seed failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
