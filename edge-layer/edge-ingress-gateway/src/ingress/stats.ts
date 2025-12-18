export type IngressStatsSnapshot = {
  startedAt: string
  mqttConnected: boolean
  lastMessageAt: string | null
  counters: Record<string, number>
  lastErrors: Record<string, string | null>
}

export class IngressStats {
  private readonly startedAt = new Date()
  private mqttConnected = false
  private lastMessageAt: Date | null = null
  private counters: Record<string, number> = {}
  private lastErrors: Record<string, string | null> = {}

  setMqttConnected(connected: boolean) {
    this.mqttConnected = connected
  }

  markMessage() {
    this.lastMessageAt = new Date()
  }

  inc(counter: string, by: number = 1) {
    this.counters[counter] = (this.counters[counter] ?? 0) + by
  }

  setLastError(key: string, message: string | null) {
    this.lastErrors[key] = message
  }

  snapshot(): IngressStatsSnapshot {
    return {
      startedAt: this.startedAt.toISOString(),
      mqttConnected: this.mqttConnected,
      lastMessageAt: this.lastMessageAt
        ? this.lastMessageAt.toISOString()
        : null,
      counters: { ...this.counters },
      lastErrors: { ...this.lastErrors },
    }
  }
}
