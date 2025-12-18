import { PrismaClient } from '@prisma/client'

export type DeviceAllowlistRow = {
  tenant_id: string
  device_id: string
  farm_id: string | null
  barn_id: string | null
  enabled: boolean
  notes: string | null
}

export type StationAllowlistRow = {
  tenant_id: string
  station_id: string
  farm_id: string | null
  barn_id: string | null
  enabled: boolean
  notes: string | null
}

export interface DeviceAllowlistStore {
  getDevice(params: {
    tenantId: string
    deviceId: string
  }): Promise<DeviceAllowlistRow | null>
}

export interface StationAllowlistStore {
  getStation(params: {
    tenantId: string
    stationId: string
  }): Promise<StationAllowlistRow | null>
}

export class PrismaAllowlistStore
  implements DeviceAllowlistStore, StationAllowlistStore
{
  constructor(private readonly prisma: PrismaClient) {}

  async getDevice(params: {
    tenantId: string
    deviceId: string
  }): Promise<DeviceAllowlistRow | null> {
    return this.prisma.deviceAllowlist.findUnique({
      where: {
        tenant_id_device_id: {
          tenant_id: params.tenantId,
          device_id: params.deviceId,
        },
      },
      select: {
        tenant_id: true,
        device_id: true,
        farm_id: true,
        barn_id: true,
        enabled: true,
        notes: true,
      },
    })
  }

  async getStation(params: {
    tenantId: string
    stationId: string
  }): Promise<StationAllowlistRow | null> {
    return this.prisma.stationAllowlist.findUnique({
      where: {
        tenant_id_station_id: {
          tenant_id: params.tenantId,
          station_id: params.stationId,
        },
      },
      select: {
        tenant_id: true,
        station_id: true,
        farm_id: true,
        barn_id: true,
        enabled: true,
        notes: true,
      },
    })
  }
}
