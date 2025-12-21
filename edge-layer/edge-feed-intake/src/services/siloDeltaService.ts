import { logger } from '../utils/logger'
import { FeedIntakeService } from './feedIntakeService'
import { PrismaClient, Prisma, Decimal } from '@prisma/client'
import { v7 as uuidv7 } from 'uuid'

/**
 * SILO delta computation service (Mode B)
 * Computes feed intake from silo.weight telemetry deltas
 * 
 * This service:
 * 1. Subscribes to silo.weight telemetry via MQTT
 * 2. Tracks previous weight readings per silo/device in SiloWeightSnapshot table
 * 3. Computes delta when weight decreases (feed dispensed)
 * 4. Creates feed intake records via FeedIntakeService
 */
export class SiloDeltaService {
  private mqttClient: any = null
  private readonly DELTA_THRESHOLD_KG = 0.1 // Minimum delta to create intake record

  constructor(
    private feedIntakeService: FeedIntakeService,
    private prisma: PrismaClient,
    private mqttConfig?: {
      brokerUrl: string
      clientId: string
      username?: string
      password?: string
    }
  ) {}

  /**
   * Process silo weight telemetry and compute delta
   * 
   * @param params - Telemetry data
   */
  async processSiloWeightTelemetry(params: {
    tenantId: string
    farmId?: string | null
    barnId: string
    deviceId: string
    currentWeightKg: number
    occurredAt: Date
    traceId?: string | null
  }): Promise<void> {
    try {
      // 1. Retrieve previous weight from DB
      const previousSnapshot = await this.prisma.siloWeightSnapshot.findUnique({
        where: {
          unique_tenant_device_silo: {
            tenantId: params.tenantId,
            deviceId: params.deviceId,
          },
        },
      })

      // 2. Compute delta if we have previous weight
      if (previousSnapshot) {
        const previousWeight = Number(previousSnapshot.weightKg)
        const currentWeight = params.currentWeightKg

        // Only process if weight decreased (feed dispensed)
        if (currentWeight < previousWeight) {
          const deltaKg = previousWeight - currentWeight

          // 3. Create intake record if delta exceeds threshold
          if (deltaKg >= this.DELTA_THRESHOLD_KG) {
            const eventId = uuidv7()
            await this.feedIntakeService.createFeedIntakeRecord({
              tenantId: params.tenantId,
              farmId: params.farmId || null,
              barnId: params.barnId,
              deviceId: params.deviceId,
              source: 'SILO_AUTO',
              quantityKg: deltaKg,
              occurredAt: params.occurredAt,
              eventId,
              traceId: params.traceId || null,
            })

            logger.info('Created feed intake from silo delta', {
              tenantId: params.tenantId,
              deviceId: params.deviceId,
              previousWeight,
              currentWeight,
              deltaKg,
              eventId,
              traceId: params.traceId,
            })
          } else {
            logger.debug('Silo delta below threshold, skipping intake record', {
              tenantId: params.tenantId,
              deviceId: params.deviceId,
              deltaKg,
              threshold: this.DELTA_THRESHOLD_KG,
            })
          }
        } else {
          logger.debug('Silo weight increased or unchanged, no intake', {
            tenantId: params.tenantId,
            deviceId: params.deviceId,
            previousWeight,
            currentWeight,
          })
        }
      } else {
        logger.debug('No previous weight snapshot found, storing initial weight', {
          tenantId: params.tenantId,
          deviceId: params.deviceId,
        })
      }

      // 4. Update weight snapshot (upsert)
      await this.prisma.siloWeightSnapshot.upsert({
        where: {
          unique_tenant_device_silo: {
            tenantId: params.tenantId,
            deviceId: params.deviceId,
          },
        },
        create: {
          tenantId: params.tenantId,
          deviceId: params.deviceId,
          weightKg: new Decimal(params.currentWeightKg),
          recordedAt: params.occurredAt,
        },
        update: {
          weightKg: new Decimal(params.currentWeightKg),
          recordedAt: params.occurredAt,
        },
      })
    } catch (error) {
      logger.error('Error processing silo weight telemetry', {
        error,
        tenantId: params.tenantId,
        deviceId: params.deviceId,
        traceId: params.traceId,
      })
      throw error
    }
  }

  /**
   * Start subscribing to silo.weight telemetry via MQTT
   */
  async start(): Promise<void> {
    if (!this.mqttConfig || !this.mqttConfig.brokerUrl) {
      logger.warn('MQTT config not provided, SILO delta service disabled', {
        note: 'Set MQTT_BROKER_URL to enable silo.weight telemetry subscription',
      })
      return
    }

    try {
      const mqtt = await import('mqtt')
      this.mqttClient = mqtt.default.connect(this.mqttConfig.brokerUrl, {
        clientId: `${this.mqttConfig.clientId}-silo-delta`,
        username: this.mqttConfig.username,
        password: this.mqttConfig.password,
        reconnectPeriod: 1000,
        connectTimeout: 5000,
      })

      this.mqttClient.on('connect', () => {
        logger.info('MQTT connected for silo.weight telemetry', {
          brokerUrl: this.mqttConfig?.brokerUrl,
        })

        // Subscribe to silo.weight telemetry
        // Topic pattern: iot/telemetry/{tenantId}/{farmId}/{barnId}/{deviceId}/silo.weight
        const topic = 'iot/telemetry/+/+/+/+/silo.weight'

        this.mqttClient.subscribe(topic, { qos: 1 }, (err: Error | null) => {
          if (err) {
            logger.error('MQTT subscribe failed for silo.weight', {
              topic,
              error: err.message,
            })
          } else {
            logger.info('MQTT subscribed to silo.weight telemetry', { topic })
          }
        })
      })

      this.mqttClient.on('message', async (topic: string, message: Buffer) => {
        try {
          // Parse MQTT telemetry envelope
          let parsed: unknown
          try {
            parsed = JSON.parse(message.toString('utf8'))
          } catch {
            logger.warn('Invalid JSON in silo.weight message', { topic })
            return
          }

          // Validate envelope structure
          if (
            typeof parsed !== 'object' ||
            parsed === null ||
            !('schema_version' in parsed) ||
            !('tenant_id' in parsed) ||
            !('device_id' in parsed) ||
            !('payload' in parsed)
          ) {
            logger.warn('Invalid envelope structure in silo.weight message', {
              topic,
            })
            return
          }

          const envelope = parsed as {
            schema_version: string
            tenant_id: string
            device_id: string
            ts?: string
            occurred_at?: string
            trace_id?: string
            payload: {
              metric_type?: string
              metric_value?: number
              value?: number
              farm_id?: string
              barn_id?: string
              [key: string]: unknown
            }
          }

          if (envelope.schema_version !== '1.0') {
            logger.warn('Unsupported schema_version in silo.weight', {
              topic,
              schema_version: envelope.schema_version,
            })
            return
          }

          // Parse topic to extract context
          const topicParts = topic.split('/')
          if (topicParts.length < 5) {
            logger.warn('Invalid topic format for silo.weight', { topic })
            return
          }

          const tenantId = topicParts[2] || envelope.tenant_id
          const farmId = topicParts[3] || envelope.payload.farm_id
          const barnId = topicParts[4] || envelope.payload.barn_id
          const deviceId = topicParts[5] || envelope.device_id

          // Extract weight value
          const weightValue =
            envelope.payload.metric_value ||
            envelope.payload.value ||
            envelope.payload.weight

          if (!tenantId || !barnId || typeof weightValue !== 'number') {
            logger.warn('Missing required fields in silo.weight message', {
              topic,
              tenantId,
              barnId,
              hasWeight: typeof weightValue === 'number',
            })
            return
          }

          const occurredAt = envelope.ts || envelope.occurred_at
          if (!occurredAt) {
            logger.warn('Missing timestamp in silo.weight message', { topic })
            return
          }

          // Process weight telemetry and compute delta
          await this.processSiloWeightTelemetry({
            tenantId,
            farmId: farmId || null,
            barnId,
            deviceId: deviceId || null,
            currentWeightKg: weightValue,
            occurredAt: new Date(occurredAt),
            traceId: envelope.trace_id || null,
          })
        } catch (error) {
          logger.error('Error processing silo.weight message', {
            topic,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      })

      this.mqttClient.on('error', (err: Error) => {
        logger.error('MQTT error for silo.weight', { error: err.message })
      })

      this.mqttClient.on('close', () => {
        logger.warn('MQTT connection closed for silo.weight')
      })

      logger.info('SILO delta service started', {
        mqttBroker: this.mqttConfig.brokerUrl,
        deltaThreshold: this.DELTA_THRESHOLD_KG,
      })
    } catch (error) {
      logger.error('Failed to start SILO delta service', {
        error,
      })
      // Don't throw - allow service to continue without SILO delta
    }
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    if (this.mqttClient) {
      return new Promise<void>((resolve) => {
        if (this.mqttClient.connected) {
          this.mqttClient.end(() => {
            logger.info('MQTT client closed for silo delta service')
            resolve()
          })
        } else {
          resolve()
        }
      })
    }
    logger.info('SILO delta service stopped')
  }
}

