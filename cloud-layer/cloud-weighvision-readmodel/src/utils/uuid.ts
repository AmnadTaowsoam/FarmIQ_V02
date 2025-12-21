import { v4 as uuidv4 } from 'uuid'

export function newUuidV7(): string {
  // Note: Using v4 as fallback since v7 is not available in uuid@9
  // TODO: Consider upgrading to uuid@11+ or using uuidv7 package when available
  return uuidv4()
}

