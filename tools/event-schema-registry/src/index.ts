export { EventSchemaValidator } from './validator'

// Convenience function
import { EventSchemaValidator } from './validator'

let defaultValidator: EventSchemaValidator | null = null

export function getDefaultValidator(): EventSchemaValidator {
  if (!defaultValidator) {
    defaultValidator = new EventSchemaValidator()
  }
  return defaultValidator
}

export function validateEventSchema(
  eventType: string,
  schemaVersion: string,
  event: any
): { valid: boolean; errors?: string[] } {
  const validator = getDefaultValidator()
  return validator.validate(eventType, schemaVersion, event)
}

export function checkBackwardCompatibility(
  eventType: string,
  oldVersion: string,
  newVersion: string
): { compatible: boolean; issues?: string[] } {
  const validator = getDefaultValidator()
  return validator.checkBackwardCompatibility(eventType, oldVersion, newVersion)
}
