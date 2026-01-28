import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

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

  // Idempotent: Upsert roles (roles have unique name constraint)

  // Create roles first
  const roles = [
    { name: 'platform_admin' },
    { name: 'tenant_admin' },
    { name: 'farm_manager' },
    { name: 'house_operator' },
    { name: 'viewer' },
    { name: 'device_agent' },
  ]

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    })
  }
  console.log(`Created/updated ${roles.length} roles`)

  // Get role IDs
  const platformAdminRole = await prisma.role.findUnique({ where: { name: 'platform_admin' } })
  const tenantAdminRole = await prisma.role.findUnique({ where: { name: 'tenant_admin' } })
  const farmManagerRole = await prisma.role.findUnique({ where: { name: 'farm_manager' } })
  const operatorRole = await prisma.role.findUnique({ where: { name: 'house_operator' } })
  const viewerRole = await prisma.role.findUnique({ where: { name: 'viewer' } })
  const deviceAgentRole = await prisma.role.findUnique({ where: { name: 'device_agent' } })

  // Hash password (default: password123)
  const hashedPassword = await bcrypt.hash('password123', 10)

  // Use fixed tenant IDs from constants
  const TENANT_1 = '00000000-0000-4000-8000-000000000001'
  const TENANT_2 = '00000000-0000-4000-8000-000000000002'

  // Create users with fixed IDs for idempotency
  const baseUsers = [
    {
      id: '00000000-0000-4000-8000-000000010001',
      email: 'admin@farmiq.com',
      password: hashedPassword,
      tenantId: null, // Platform admin
      roleId: platformAdminRole!.id,
    },
    {
      id: '00000000-0000-4000-8000-000000010002',
      email: 'tenant1.admin@farmiq.com',
      password: hashedPassword,
      tenantId: TENANT_1,
      roleId: tenantAdminRole!.id,
    },
    {
      id: '00000000-0000-4000-8000-000000010003',
      email: 'tenant1.manager@farmiq.com',
      password: hashedPassword,
      tenantId: TENANT_1,
      roleId: farmManagerRole!.id,
    },
    {
      id: '00000000-0000-4000-8000-000000010004',
      email: 'tenant2.admin@farmiq.com',
      password: hashedPassword,
      tenantId: TENANT_2,
      roleId: tenantAdminRole!.id,
    },
    {
      id: '00000000-0000-4000-8000-000000010005',
      email: 'tenant2.manager@farmiq.com',
      password: hashedPassword,
      tenantId: TENANT_2,
      roleId: farmManagerRole!.id,
    },
  ]

  // Generate additional users up to SEED_COUNT
  const additionalCount = Math.max(0, SEED_COUNT - baseUsers.length)
  const users: Array<{
    id: string
    email: string
    password: string
    tenantId: string | null
    roleId: string
  }> = [...baseUsers]

  for (let i = 0; i < additionalCount; i++) {
    const num = (i + 6).toString(16).padStart(4, '0')
    const tenantId = i % 2 === 0 ? TENANT_1 : TENANT_2
    const role = i % 4 === 0 ? operatorRole!.id : viewerRole!.id

    users.push({
      id: `00000000-0000-4000-8000-00000001${num}`,
      email: `user${i + 1}@farmiq.com`,
      password: hashedPassword,
      tenantId,
      roleId: role,
    })
  }

  // Idempotent: Upsert users by ID
  let createdCount = 0
  for (const user of users) {
    const existing = await prisma.user.findUnique({ where: { id: user.id } })
    if (!existing) {
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          password: user.password,
          tenantId: user.tenantId,
          roles: {
            connect: [{ id: user.roleId }],
          },
        },
      })
      createdCount++
    } else {
      // Update existing user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.email,
          password: user.password,
          tenantId: user.tenantId,
          roles: {
            set: [{ id: user.roleId }],
          },
        },
      })
    }
  }
  console.log(`Upserted ${users.length} users (${createdCount} created, ${users.length - createdCount} updated)`)

  console.log('Seed completed successfully!')
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

