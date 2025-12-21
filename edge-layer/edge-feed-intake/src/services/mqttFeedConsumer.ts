import mqtt from 'mqtt'
import type { MqttClient } from 'mqtt'
import { logger } from '../utils/logger'
import { FeedIntakeService } from './feedIntakeService'

export type MqttFeedConsumerConfig = {
  brokerUrl: string
  clientId: string
  username?: string
  password?: string
}

export type MqttFeedConsumerState = {
  client: MqttClient
  isConnected: () => boolean
  close: () => Promise<void>
}

/**
 * MQTT consumer for feed.dispensed events (Mode A)
 * Subscribes to: iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/feed.dispensed
 */
export function startMqttFeedConsumer(params: {
  config: MqttFeedConsumerConfig
  feedIntakeService: FeedIntakeService
}): MqttFeedConsumerState {
  const client = mqtt.connect(params.config.brokerUrl, {
    clientId: params.config.clientId,
    username: params.config.username,
    password: params.config.password,
    reconnectPeriod: 1000,
    connectTimeout: 5000,
  })

  let connected = false

  client.on('connect', () => {
    connected = true
    logger.info('MQTT connected for feed intake', {
      brokerUrl: params.config.brokerUrl,
    })

    // Subscribe to feed.dispensed events
    // Topic pattern: iot/event/{tenantId}/{farmId}/{barnId}/{deviceId}/feed.dispensed
    const topic = 'iot/event/+/+/+/+/feed.dispensed'

    client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        logger.error('MQTT subscribe failed for feed.dispensed', {
          topic,
          error: err.message,
        })
      } else {
        logger.info('MQTT subscribed to feed.dispensed events', { topic })
      }
    })
  })

  client.on('reconnect', () => {
    logger.warn('MQTT reconnecting for feed intake', {
      brokerUrl: params.config.brokerUrl,
    })
  })

  client.on('close', () => {
    connected = false
    logger.warn('MQTT connection closed for feed intake')
  })

  client.on('error', (err) => {
    logger.error('MQTT error for feed intake', { error: err.message })
  })

  client.on('message', async (topic, message) => {
    try {
      // Parse MQTT envelope
      let parsed: unknown
      try {
        parsed = JSON.parse(message.toString('utf8'))
      } catch {
        logger.warn('Invalid JSON in feed.dispensed message', { topic })
        return
      }

      // Validate envelope structure (simplified - matches MQTT envelope schema)
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('schema_version' in parsed) ||
        !('event_id' in parsed) ||
        !('tenant_id' in parsed) ||
        !('device_id' in parsed) ||
        !('payload' in parsed)
      ) {
        logger.warn('Invalid envelope structure in feed.dispensed message', {
          topic,
        })
        return
      }

      const envelope = parsed as {
        schema_version: string
        event_id: string
        trace_id?: string
        tenant_id: string
        device_id: string
        ts?: string
        occurred_at?: string
        payload: {
          farm_id?: string
          barn_id?: string
          batch_id?: string
          quantity_kg?: number
          feed_formula_id?: string
          feed_lot_id?: string
          [key: string]: unknown
        }
      }

      if (envelope.schema_version !== '1.0') {
        logger.warn('Unsupported schema_version in feed.dispensed', {
          topic,
          schema_version: envelope.schema_version,
        })
        return
      }

      // Parse topic to extract context
      const topicParts = topic.split('/')
      if (topicParts.length < 5) {
        logger.warn('Invalid topic format for feed.dispensed', { topic })
        return
      }

      const tenantId = topicParts[2] || envelope.tenant_id
      const farmId = topicParts[3] || envelope.payload.farm_id
      const barnId = topicParts[4] || envelope.payload.barn_id
      const deviceId = topicParts[5] || envelope.device_id

      if (!tenantId || !barnId || !envelope.payload.quantity_kg) {
        logger.warn('Missing required fields in feed.dispensed message', {
          topic,
          tenantId,
          barnId,
          hasQuantity: !!envelope.payload.quantity_kg,
        })
        return
      }

      const occurredAt = envelope.ts || envelope.occurred_at
      if (!occurredAt) {
        logger.warn('Missing timestamp in feed.dispensed message', { topic })
        return
      }

      // Create feed intake record
      await params.feedIntakeService.createFeedIntakeRecord({
        tenantId,
        farmId: farmId || null,
        barnId,
        batchId: envelope.payload.batch_id || null,
        deviceId: deviceId || null,
        source: 'MQTT_DISPENSED',
        feedFormulaId: envelope.payload.feed_formula_id || null,
        feedLotId: envelope.payload.feed_lot_id || null,
        quantityKg: envelope.payload.quantity_kg,
        occurredAt: new Date(occurredAt),
        eventId: envelope.event_id,
        traceId: envelope.trace_id || null,
      })

      logger.info('Processed feed.dispensed event', {
        topic,
        tenantId,
        barnId,
        eventId: envelope.event_id,
        quantityKg: envelope.payload.quantity_kg,
      })
    } catch (error) {
      logger.error('Error processing feed.dispensed message', {
        topic,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  return {
    client,
    isConnected: () => connected,
    close: async () => {
      return new Promise<void>((resolve) => {
        if (client.connected) {
          client.end(() => {
            logger.info('MQTT client closed for feed intake')
            resolve()
          })
        } else {
          resolve()
        }
      })
    },
  }
}

