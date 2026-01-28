import { PrismaClient } from '@prisma/client'
import { SEED_IDS, getAllDeviceIds } from './seed-constants'

const prisma = new PrismaClient()

// Guard: prevent seed in production
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PROD) {
  console.error('ERROR: Seed is not allowed in production!')
  console.error('Set ALLOW_SEED_IN_PROD=true if you really want to seed production.')
  process.exit(1)
}

const SEED_COUNT = parseInt(process.env.SEED_COUNT || '30', 10)

async function main() {
  console.log(`Starting seed (SEED_COUNT=${SEED_COUNT})...`)

  // Idempotent: Clear existing data (dev only)
  if (process.env.NODE_ENV !== 'production') {
    await prisma.deviceLastSeen.deleteMany({})
    await prisma.ingressDedupe.deleteMany({})
    await prisma.stationAllowlist.deleteMany({})
    await prisma.deviceAllowlist.deleteMany({})
  }

  const deviceIds = getAllDeviceIds()
  const tenants = [SEED_IDS.TENANT_1, SEED_IDS.TENANT_2]
  const farms = [SEED_IDS.FARM_1A, SEED_IDS.FARM_1B, SEED_IDS.FARM_2A, SEED_IDS.FARM_2B]
  const barns = [
    SEED_IDS.BARN_1A_1,
    SEED_IDS.BARN_1A_2,
    SEED_IDS.BARN_1B_1,
    SEED_IDS.BARN_1B_2,
    SEED_IDS.BARN_2A_1,
    SEED_IDS.BARN_2A_2,
  ]
  const stations = [
    SEED_IDS.STATION_1A_1,
    SEED_IDS.STATION_1A_2,
    SEED_IDS.STATION_1B_1,
    SEED_IDS.STATION_1B_2,
  ]

  // Device allowlist - from registry (all devices)
  const deviceAllowlist = deviceIds.map((deviceId, index) => {
    const tenantId = index % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farms[index % farms.length]
    const barnId = barns[index % barns.length]
    return {
      tenant_id: tenantId,
      device_id: deviceId,
      farm_id: farmId,
      barn_id: barnId,
      enabled: true,
      notes: 'seed',
    }
  })

  // Station allowlist
  const stationAllowlist = stations.map((stationId, index) => {
    const tenantId = index % 2 === 0 ? SEED_IDS.TENANT_1 : SEED_IDS.TENANT_2
    const farmId = farms[index % farms.length]
    const barnId = barns[index % barns.length]
    return {
      tenant_id: tenantId,
      station_id: stationId,
      farm_id: farmId,
      barn_id: barnId,
      enabled: true,
      notes: 'seed',
    }
  })

  // Recent telemetry dedupe (last 24 hours)
  const now = Date.now()
  const recordCount = Math.max(SEED_COUNT, 30)
  const ingressDedupe = Array.from({ length: recordCount }, (_, index) => {
    const tenantId = tenants[index % tenants.length]
    const deviceId = deviceIds[index % deviceIds.length]
    const farmId = farms[index % farms.length]
    const barnId = barns[index % barns.length]
    return {
      tenant_id: tenantId,
      event_id: `evt-${index.toString().padStart(6, '0')}`,
      first_seen_at: new Date(now - (index % 24) * 60 * 60 * 1000), // Last 24 hours
      expires_at: new Date(now + (24 * 60 * 60 * 1000) - (index % 24) * 60 * 60 * 1000),
      topic: `iot/telemetry/${tenantId}/${farmId}/${barnId}/${deviceId}/temperature`,
      hash: `hash-${index.toString().padStart(6, '0')}`,
    }
  })

  // Device last seen (recent activity)
  const deviceLastSeen = deviceIds.slice(0, Math.min(deviceIds.length, recordCount)).map((deviceId, index) => {
    const tenantId = tenants[index % tenants.length]
    const farmId = farms[index % farms.length]
    const barnId = barns[index % barns.length]
    return {
      tenant_id: tenantId,
      device_id: deviceId,
      last_seen_at: new Date(now - (index % 60) * 60 * 1000), // Last hour
      last_topic: `iot/status/${tenantId}/${farmId}/${barnId}/${deviceId}`,
      last_payload_hash: `plh-${index.toString().padStart(6, '0')}`,
    }
  })

  await prisma.deviceAllowlist.createMany({ data: deviceAllowlist, skipDuplicates: true })
  await prisma.stationAllowlist.createMany({ data: stationAllowlist, skipDuplicates: true })
  await prisma.ingressDedupe.createMany({ data: ingressDedupe, skipDuplicates: true })
  await prisma.deviceLastSeen.createMany({ data: deviceLastSeen, skipDuplicates: true })

  console.log(
    `Seeded: device_allowlist=${deviceAllowlist.length}, station_allowlist=${stationAllowlist.length}, ingress_dedupe=${ingressDedupe.length}, device_last_seen=${deviceLastSeen.length}`
  )
}

main()
  .catch((error) => {
    console.error('Seed failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
