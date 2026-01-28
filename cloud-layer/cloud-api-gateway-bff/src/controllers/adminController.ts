import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { tenantRegistryServiceClient } from '../services/tenantRegistryService'
import { identityServiceClient } from '../services/identityService'
import { callDownstreamJson, getServiceBaseUrls } from '../services/dashboardService'

function buildDownstreamHeaders(req: Request, res: Response): Record<string, string> {
    const headers: Record<string, string> = {}
    if (req.headers.authorization) headers.authorization = req.headers.authorization
    if (res.locals.requestId) headers['x-request-id'] = res.locals.requestId
    if (res.locals.traceId) headers['x-trace-id'] = res.locals.traceId
    return headers
}

async function probeHealth(name: string, url: string): Promise<{ name: string; status: 'healthy' | 'degraded' | 'down' | 'unknown' }> {
    try {
        const start = Date.now()
        const result = await callDownstreamJson(url, { method: 'GET', headers: {} })
        if (!result.ok) return { name, status: result.status >= 500 ? 'down' : 'degraded' }
        return { name, status: 'healthy' }
    } catch (error) {
        return { name, status: 'down' }
    }
}

export async function getAdminOverviewHandler(req: Request, res: Response): Promise<void> {
    const startTime = Date.now()
    const headers = buildDownstreamHeaders(req, res)

    try {
        // Parallel fetching
        const [tenantsRes, usersRes, devicesRes] = await Promise.all([
            // Fetch small page to get 'total' count
            tenantRegistryServiceClient.getAdminTenants({ query: { pageSize: '1' }, headers }),
            identityServiceClient.getAdminUsers({ query: { pageSize: '1' }, headers }),
            tenantRegistryServiceClient.getAdminDevices({ query: { pageSize: '1' }, headers })
        ])

        const totalTenants = (tenantsRes.ok && (tenantsRes.data as any).total) || 0
        const totalUsers = (usersRes.ok && (usersRes.data as any).total) || 0
        const totalDevices = (devicesRes.ok && (devicesRes.data as any).total) || 0

        // For devices online/offline, we need to query based on status if API supports it
        // tenantRegistryServiceClient doesn't have explicit count-only method exposed here nicely without another call
        // Let's call for 'online' devices
        const onlineDevicesRes = await tenantRegistryServiceClient.getAdminDevices({ query: { status: 'online', pageSize: '1' }, headers })
        const devicesOnline = (onlineDevicesRes.ok && (onlineDevicesRes.data as any).total) || 0
        const devicesOffline = Math.max(0, totalDevices - devicesOnline)

        // Estimate Farms/Barns from tenants list (Need to fetch meaningful number of tenants to sum up)
        // Or if getAdminTenants response structure puts them in top-level meta? No.
        // We will do a separate call to fetch first 100 tenants to estimate or sum up.
        // Ideally we should add an aggregation endpoint to tenant-registry.
        const tenantsListRes = await tenantRegistryServiceClient.getAdminTenants({ query: { pageSize: '100' }, headers })
        const tenants = (tenantsListRes.ok && (tenantsListRes.data as any).data) || []
        const totalFarms = tenants.reduce((acc: number, t: any) => acc + (t.farmCount || 0), 0)
        const totalBarns = tenants.reduce((acc: number, t: any) => acc + (t.barnCount || 0), 0)

        // Health
        const bases = getServiceBaseUrls()
        const healthTargets = [
            { name: 'api', url: `${bases.registryBaseUrl}/api/health` }, // representing core api
            { name: 'database', url: `${bases.registryBaseUrl}/api/health` }, // proxy
            { name: 'mqtt', url: `${bases.registryBaseUrl}/api/health` }, // proxy
            { name: 'storage', url: `${bases.registryBaseUrl}/api/health` } // proxy
        ]
        const healthResults = await Promise.all(healthTargets.map(t => probeHealth(t.name, t.url)))
        const systemHealth = {
            api: healthResults[0].status,
            database: healthResults[1].status, // TODO: Real DB health check
            mqtt: healthResults[2].status,     // TODO: Real MQTT health check
            storage: healthResults[3].status   // TODO: Real Storage health check
        }

        const response = {
            totalTenants,
            totalFarms, // Approximate
            totalBarns, // Approximate
            totalDevices,
            totalUsers,
            devicesOnline,
            devicesOffline,
            lastDataIngest: new Date().toISOString(),
            lastSync: new Date().toISOString(),
            topAlerts: [], // Not implemented yet
            systemHealth
        }

        res.json(response)
    } catch (error) {
        logger.error('Error in getAdminOverviewHandler', error)
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to build admin overview',
                traceId: res.locals.traceId || 'unknown'
            }
        })
    }
}
