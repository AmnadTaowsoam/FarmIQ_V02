import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tenants = ['t-001', 't-002']

  const deviceAllowlist = Array.from({ length: 40 }, (_, index) => ({
    tenant_id: tenants[index % tenants.length],
    device_id: `device-${(index + 1).toString().padStart(3, '0')}`,
    farm_id: 'f-001',
    barn_id: 'b-001',
    enabled: index % 13 !== 0,
    notes: 'seed',
  }))

  const stationAllowlist = Array.from({ length: 40 }, (_, index) => ({
    tenant_id: tenants[index % tenants.length],
    station_id: `station-${(index + 1).toString().padStart(3, '0')}`,
    farm_id: 'f-001',
    barn_id: 'b-001',
    enabled: index % 11 !== 0,
    notes: 'seed',
  }))

  const now = Date.now()
  const ingressDedupe = Array.from({ length: 40 }, (_, index) => ({
    tenant_id: tenants[index % tenants.length],
    event_id: `evt-${(index + 1).toString().padStart(6, '0')}`,
    first_seen_at: new Date(now - index * 60_000),
    expires_at: new Date(now + (24 * 60 * 60_000) - index * 60_000),
    topic: `iot/telemetry/${tenants[index % tenants.length]}/f-001/b-001/device-${(index + 1)
      .toString()
      .padStart(3, '0')}/temperature`,
    hash: `hash-${(index + 1).toString().padStart(6, '0')}`,
  }))

  const deviceLastSeen = Array.from({ length: 40 }, (_, index) => ({
    tenant_id: tenants[index % tenants.length],
    device_id: `device-${(index + 1).toString().padStart(3, '0')}`,
    last_seen_at: new Date(now - index * 30_000),
    last_topic: `iot/status/${tenants[index % tenants.length]}/f-001/b-001/device-${(index + 1)
      .toString()
      .padStart(3, '0')}`,
    last_payload_hash: `plh-${(index + 1).toString().padStart(6, '0')}`,
  }))

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
