import { PrismaDedupeStore } from '../../src/db/dedupeStore'

describe('PrismaDedupeStore', () => {
  it('returns true when create succeeds', async () => {
    const prisma: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ tenant_id: 't' }]),
      ingressDedupe: { deleteMany: jest.fn() },
    }
    const store = new PrismaDedupeStore(prisma)
    await expect(
      store.tryMarkSeen({ tenantId: 't', eventId: 'e', topic: 'topic', ttlMs: 1000 })
    ).resolves.toBe(true)
  })

  it('returns false when insert/update returns no rows (not expired duplicate)', async () => {
    const prisma: any = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      ingressDedupe: { deleteMany: jest.fn() },
    }
    const store = new PrismaDedupeStore(prisma)
    await expect(
      store.tryMarkSeen({ tenantId: 't', eventId: 'e', topic: 'topic', ttlMs: 1000 })
    ).resolves.toBe(false)
  })

  it('cleanupExpired returns deleteMany count', async () => {
    const prisma: any = {
      $queryRaw: jest.fn(),
      ingressDedupe: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
    }
    const store = new PrismaDedupeStore(prisma)
    await expect(store.cleanupExpired()).resolves.toBe(3)
  })
})
