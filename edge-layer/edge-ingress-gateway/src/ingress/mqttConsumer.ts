import mqtt from 'mqtt'
import type { MqttClient } from 'mqtt'
import { logger } from '../utils/logger'
import { IngressStats } from './stats'
import { parseTopic } from './topic'
import { processIngressMessage, IngressProcessorDeps } from './processor'

export type MqttConsumerConfig = {
  brokerUrl: string
  clientId: string
  username?: string
  password?: string
}

export type MqttConsumerState = {
  client: MqttClient
  isConnected: () => boolean
  close: () => Promise<void>
}

/**
 *
 * @param params
 * @param params.config
 * @param params.stats
 * @param params.deps
 */
export function startMqttConsumer(params: {
  config: MqttConsumerConfig
  stats: IngressStats
  deps: IngressProcessorDeps
}): MqttConsumerState {
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
    params.stats.setMqttConnected(true)
    logger.info('MQTT connected', { brokerUrl: params.config.brokerUrl })

    const subscriptions: Array<{ topic: string; qos: 0 | 1 }> = [
      { topic: 'iot/telemetry/+/+/+/+/+', qos: 1 },
      { topic: 'iot/event/+/+/+/+/+', qos: 1 },
      { topic: 'iot/weighvision/+/+/+/+/session/+/+', qos: 1 },
      { topic: 'iot/status/+/+/+/+', qos: 1 },
    ]

    subscriptions.forEach((s) => {
      client.subscribe(s.topic, { qos: s.qos }, (err) => {
        if (err) {
          logger.error('MQTT subscribe failed', {
            topic: s.topic,
            error: err.message,
          })
        } else {
          logger.info('MQTT subscribed', { topic: s.topic, qos: s.qos })
        }
      })
    })
  })

  client.on('reconnect', () => {
    logger.warn('MQTT reconnecting', { brokerUrl: params.config.brokerUrl })
  })

  client.on('close', () => {
    connected = false
    params.stats.setMqttConnected(false)
    logger.warn('MQTT connection closed')
  })

  client.on('error', (err) => {
    logger.error('MQTT error', { error: err.message })
  })

  const handleMessage = async (
    topic: string,
    message: Buffer
  ): Promise<void> => {
    params.stats.markMessage()
    params.stats.inc('messages_received_total')

    const parsedTopic = parseTopic(topic)
    if (!parsedTopic) {
      params.stats.inc('messages_invalid_total')
      logger.warn('Dropping message with invalid topic', { topic })
      return
    }

    try {
      const decision = await processIngressMessage({
        topic: parsedTopic,
        rawTopic: topic,
        message,
        deps: params.deps,
      })
      if (decision.action === 'dropped') {
        params.stats.inc('messages_invalid_total')
        if (decision.reason.includes('dedupe')) {
          params.stats.inc('messages_deduped_total')
        }
        logger.warn('MQTT message dropped', {
          topic,
          topicKind: parsedTopic.kind,
          eventId: decision.eventId,
          traceId: decision.traceId,
          reason: decision.reason,
        })
      } else {
        params.stats.inc('messages_valid_total')
        if (decision.routedTo) {
          const key = decision.routedTo.replace(/[^a-zA-Z0-9_]+/g, '_')
          params.stats.inc(`routed_${key}_total`)
          if (decision.routedTo.includes('(failed)')) {
            params.stats.inc(`routed_${key}_fail_total`)
            params.stats.setLastError(
              `routed_${key}`,
              'downstream request failed'
            )
          } else {
            params.stats.inc(`routed_${key}_success_total`)
            params.stats.setLastError(`routed_${key}`, null)
          }
        }
        logger.info('MQTT message processed', {
          topic,
          topicKind: parsedTopic.kind,
          eventId: decision.eventId,
          traceId: decision.traceId,
          routedTo: decision.routedTo,
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown error'
      params.stats.inc('messages_processing_errors_total')
      logger.error('MQTT processing error', { topic, error: message })
    }
  }

  client.on('message', (topic, message) => {
    void handleMessage(topic, message)
  })

  return {
    client,
    isConnected: () => connected,
    close: () =>
      new Promise((resolve) => {
        client.end(true, {}, () => resolve())
      }),
  }
}
