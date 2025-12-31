import { createDataSource } from './dataSource'
import { ensureSyncSchema } from './ensureSchema'

async function main() {
  const dataSource = createDataSource()
  await dataSource.initialize()
  await ensureSyncSchema(dataSource)
  await dataSource.destroy()
  console.log('edge-sync-forwarder DB schema ensured')
}

main().catch((error) => {
  console.error('edge-sync-forwarder db:migrate failed', error)
  process.exitCode = 1
})

