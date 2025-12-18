import crypto from 'crypto'

/**
 *
 * @param data
 */
export function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}
