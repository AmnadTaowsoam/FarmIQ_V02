import { InMemoryDedupeStore } from '../../src/db/dedupeStore'

describe('InMemoryDedupeStore', () => {
  it('returns true on first mark and false on duplicates', async () => {
    const dedupe = new InMemoryDedupeStore()
    await expect(
      dedupe.tryMarkSeen({ tenantId: 't-1', eventId: 'e-1', topic: 't', ttlMs: 1000 })
    ).resolves.toBe(true)
    await expect(
      dedupe.tryMarkSeen({ tenantId: 't-1', eventId: 'e-1', topic: 't', ttlMs: 1000 })
    ).resolves.toBe(false)
    await expect(
      dedupe.tryMarkSeen({ tenantId: 't-1', eventId: 'e-2', topic: 't', ttlMs: 1000 })
    ).resolves.toBe(true)
  })
})
