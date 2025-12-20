import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Clear existing data (optional - comment out if you want to keep existing data)
  await prisma.user.deleteMany({})
  await prisma.role.deleteMany({})

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

  // Create 10 users
  const users = [
    {
      email: 'admin@farmiq.com',
      password: hashedPassword,
      tenantId: null, // Platform admin
      roles: {
        connect: [{ id: platformAdminRole!.id }],
      },
    },
    {
      email: 'tenant1.admin@farmiq.com',
      password: hashedPassword,
      tenantId: 'tenant-001',
      roles: {
        connect: [{ id: tenantAdminRole!.id }],
      },
    },
    {
      email: 'tenant1.manager@farmiq.com',
      password: hashedPassword,
      tenantId: 'tenant-001',
      roles: {
        connect: [{ id: farmManagerRole!.id }],
      },
    },
    {
      email: 'tenant1.operator@farmiq.com',
      password: hashedPassword,
      tenantId: 'tenant-001',
      roles: {
        connect: [{ id: operatorRole!.id }],
      },
    },
    {
      email: 'tenant1.viewer@farmiq.com',
      password: hashedPassword,
      tenantId: 'tenant-001',
      roles: {
        connect: [{ id: viewerRole!.id }],
      },
    },
    {
      email: 'tenant2.admin@farmiq.com',
      password: hashedPassword,
      tenantId: 'tenant-002',
      roles: {
        connect: [{ id: tenantAdminRole!.id }],
      },
    },
    {
      email: 'tenant2.manager@farmiq.com',
      password: hashedPassword,
      tenantId: 'tenant-002',
      roles: {
        connect: [{ id: farmManagerRole!.id }],
      },
    },
    {
      email: 'device.sensor01@farmiq.com',
      password: hashedPassword,
      tenantId: 'tenant-001',
      roles: {
        connect: [{ id: deviceAgentRole!.id }],
      },
    },
    {
      email: 'device.sensor02@farmiq.com',
      password: hashedPassword,
      tenantId: 'tenant-001',
      roles: {
        connect: [{ id: deviceAgentRole!.id }],
      },
    },
    {
      email: 'tenant2.viewer@farmiq.com',
      password: hashedPassword,
      tenantId: 'tenant-002',
      roles: {
        connect: [{ id: viewerRole!.id }],
      },
    },
  ]

  for (const user of users) {
    await prisma.user.create({
      data: user,
    })
  }
  console.log(`Created ${users.length} users`)

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

