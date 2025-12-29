import 'reflect-metadata'
import path from 'path'
import { DataSource } from 'typeorm'
import { OutboxEntity } from './entities/OutboxEntity'
import { OutboxDlqEntity } from './entities/OutboxDlqEntity'

export function createDataSource(): DataSource {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }

  return new DataSource({
    type: 'postgres',
    url,
    entities: [OutboxEntity, OutboxDlqEntity],
    migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
    synchronize: false,
    logging: false,
  })
}
