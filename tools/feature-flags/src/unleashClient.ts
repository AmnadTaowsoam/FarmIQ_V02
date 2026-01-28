/**
 * Unleash Feature Flag Client
 * Provides feature flag functionality for FarmIQ services
 */

import { initialize, Unleash } from 'unleash-client'

export interface FeatureFlagConfig {
  url: string
  appName: string
  instanceId?: string
  environment?: string
  refreshInterval?: number
}

export class FeatureFlagClient {
  private client: Unleash | null = null
  private config: FeatureFlagConfig

  constructor(config: FeatureFlagConfig) {
    this.config = config
  }

  /**
   * Initialize Unleash client
   */
  async initialize(): Promise<void> {
    this.client = initialize({
      url: this.config.url,
      appName: this.config.appName,
      instanceId: this.config.instanceId || `farmiq-${this.config.appName}-${Date.now()}`,
      environment: this.config.environment || 'production',
      refreshInterval: this.config.refreshInterval || 15000,
    })

    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Client not initialized'))
        return
      }

      this.client.on('ready', () => {
        resolve()
      })

      this.client.on('error', (error) => {
        reject(error)
      })
    })
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(featureName: string, context?: any): boolean {
    if (!this.client) {
      return false
    }

    return this.client.isEnabled(featureName, context)
  }

  /**
   * Get feature variant
   */
  getVariant(featureName: string, context?: any): any {
    if (!this.client) {
      return { enabled: false }
    }

    return this.client.getVariant(featureName, context)
  }

  /**
   * Destroy client
   */
  destroy(): void {
    if (this.client) {
      this.client.destroy()
      this.client = null
    }
  }
}

// Singleton instance
let defaultClient: FeatureFlagClient | null = null

export function getFeatureFlagClient(config?: FeatureFlagConfig): FeatureFlagClient {
  if (!defaultClient && config) {
    defaultClient = new FeatureFlagClient(config)
  }
  if (!defaultClient) {
    throw new Error('Feature flag client not initialized. Call with config first.')
  }
  return defaultClient
}

export function isFeatureEnabled(featureName: string, context?: any): boolean {
  const client = getFeatureFlagClient()
  return client.isEnabled(featureName, context)
}
