/**
 * Event Schema Validator
 * Validates events against registered schemas
 */

import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import * as fs from 'fs'
import * as path from 'path'

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)

interface EventEnvelope {
  schema_version: string
  event_id: string
  trace_id: string
  tenant_id: string
  device_id?: string
  event_type: string
  ts: string
  payload: any
}

export class EventSchemaValidator {
  private schemas: Map<string, any> = new Map()
  private schemaDir: string

  constructor(schemaDir: string = './schemas') {
    this.schemaDir = schemaDir
    this.loadSchemas()
  }

  /**
   * Load all schemas from directory
   */
  private loadSchemas(): void {
    if (!fs.existsSync(this.schemaDir)) {
      return
    }

    const walkDir = (dir: string, basePath: string = ''): void => {
      const files = fs.readdirSync(dir)

      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)

        if (stat.isDirectory()) {
          walkDir(filePath, path.join(basePath, file))
        } else if (file.endsWith('.json')) {
          const schema = JSON.parse(fs.readFileSync(filePath, 'utf8'))
          const key = this.getSchemaKey(schema, basePath, file)
          this.schemas.set(key, schema)
        }
      }
    }

    walkDir(this.schemaDir)
  }

  /**
   * Get schema key from event type and version
   */
  private getSchemaKey(schema: any, basePath: string, filename: string): string {
    const eventType = schema.properties?.event_type?.enum?.[0] || filename.replace('.json', '')
    const version = schema.properties?.schema_version?.enum?.[0] || '1.0'
    return `${eventType}:${version}`
  }

  /**
   * Validate event against schema
   */
  validate(eventType: string, schemaVersion: string, event: EventEnvelope): {
    valid: boolean
    errors?: string[]
  } {
    const key = `${eventType}:${schemaVersion}`
    const schema = this.schemas.get(key)

    if (!schema) {
      return {
        valid: false,
        errors: [`Schema not found: ${key}`],
      }
    }

    const validate = ajv.compile(schema)
    const valid = validate(event)

    if (!valid) {
      return {
        valid: false,
        errors: validate.errors?.map((err) => `${err.instancePath} ${err.message}`),
      }
    }

    return { valid: true }
  }

  /**
   * Get schema for event type and version
   */
  getSchema(eventType: string, schemaVersion: string): any {
    const key = `${eventType}:${schemaVersion}`
    return this.schemas.get(key)
  }

  /**
   * Check backward compatibility between schema versions
   */
  checkBackwardCompatibility(
    eventType: string,
    oldVersion: string,
    newVersion: string
  ): {
    compatible: boolean
    issues?: string[]
  } {
    const oldSchema = this.getSchema(eventType, oldVersion)
    const newSchema = this.getSchema(eventType, newVersion)

    if (!oldSchema || !newSchema) {
      return {
        compatible: false,
        issues: ['One or both schemas not found'],
      }
    }

    const issues: string[] = []

    // Check if required fields were removed
    const oldRequired = oldSchema.required || []
    const newRequired = newSchema.required || []

    for (const field of oldRequired) {
      if (!newRequired.includes(field)) {
        issues.push(`Required field removed: ${field}`)
      }
    }

    // Check if field types changed
    const oldProperties = oldSchema.properties || {}
    const newProperties = newSchema.properties || {}

    for (const [field, oldProp] of Object.entries(oldProperties)) {
      const newProp = newProperties[field]
      if (newProp && (oldProp as any).type !== (newProp as any).type) {
        issues.push(`Field type changed: ${field}`)
      }
    }

    return {
      compatible: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
    }
  }
}
