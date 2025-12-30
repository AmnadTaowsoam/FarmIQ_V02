import { http, HttpResponse, delay } from 'msw';

const API_BASE_URL = 'http://localhost:5130/api/v1';
const API_ROOT = 'http://localhost:5130/api';

export const handlers = [
    // Health
    http.get(`${API_ROOT}/health`, () => {
        return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
    }),

    // Auth
    http.post(`${API_BASE_URL}/auth/login`, async () => {
        await delay(800);
        return HttpResponse.json({
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            user: { id: 'user_1', email: 'test@farmiq.com', name: 'Test User', roles: ['admin'] }
        });
    }),

    // Users Me
    http.get(`${API_BASE_URL}/users/me`, async () => {
        await delay(800);
        return HttpResponse.json({
            id: 'user_1', email: 'test@farmiq.com', name: 'Test User', roles: ['admin']
        });
    }),

    // Registry: Tenants
    http.get(`${API_BASE_URL}/registry/tenants`, async () => {
        await delay(800);
        return HttpResponse.json({
            data: [
                { id: 't1', name: 'Global Agri Corp', domain: 'global-agri.com' },
                { id: 't2', name: 'Precision Farms Ltd', domain: 'precision-farms.io' }
            ]
        });
    }),

    // Registry: Farms
    http.get(`${API_BASE_URL}/registry/farms`, async () => {
        await delay(800);
        return HttpResponse.json({
            data: [
                { id: 'f1', farm_id: 'f1', name: 'Valley View Farm', tenant_id: 't1', location: 'Northern Highlands', status: 'active', barn_count: 8 },
                { id: 'f2', farm_id: 'f2', name: 'Green Pastures', tenant_id: 't1', location: 'South River Valley', status: 'active', barn_count: 5 },
                { id: 'f3', farm_id: 'f3', name: 'Mountain Ridge', tenant_id: 't1', location: 'Eastern Slopes', status: 'pending', barn_count: 0 }
            ]
        });
    }),

    // Registry: Barns
    http.get(`${API_BASE_URL}/registry/barns`, async () => {
        await delay(800);
        return HttpResponse.json({
            data: [
                { id: 'b1', barn_id: 'b1', name: 'Barn A - Finisher', farm_id: 'f1', tenant_id: 't1', capacity: 1000, current_occupancy: 942, status: 'active' },
                { id: 'b2', barn_id: 'b2', name: 'Barn B - Nursery', farm_id: 'f1', tenant_id: 't1', capacity: 500, current_occupancy: 480, status: 'active' },
                { id: 'b3', barn_id: 'b3', name: 'Barn C - Quarantine', farm_id: 'f1', tenant_id: 't1', capacity: 100, current_occupancy: 12, status: 'warning' }
            ]
        });
    }),

    // Registry: Devices
    http.get(`${API_BASE_URL}/registry/devices`, () => {
        return HttpResponse.json({
            data: [
                { id: 'd1', device_id: 'd1', name: 'Gateway Hub #1', type: 'gateway', status: 'active', health: 98, last_seen: new Date().toISOString(), location: 'Barn A' },
                { id: 'd2', device_id: 'd2', name: 'Environment Sensor #44', type: 'sensor', status: 'active', health: 100, last_seen: new Date().toISOString(), location: 'Barn A' },
                { id: 'd3', device_id: 'd3', name: 'WeighVision Camera #09', type: 'camera', status: 'warning', health: 12, last_seen: new Date(Date.now() - 3600000).toISOString(), location: 'Barn B' },
                { id: 'd4', device_id: 'd4', name: 'Smart Feeder #12', type: 'actuator', status: 'active', health: 85, last_seen: new Date().toISOString(), location: 'Barn C' }
            ]
        });
    }),
    http.post(`${API_BASE_URL}/registry/devices`, async ({ request }) => {
        await delay(800);
        const body = await request.json() as any;
        return HttpResponse.json({
            data: {
                id: `d${Date.now()}`,
                device_id: `d${Date.now()}`,
                name: body.serialNo || 'New Device',
                type: body.deviceType,
                status: 'active',
                health: 100,
                last_seen: new Date().toISOString(),
                location: 'Barn A' // Default for mock
            }
        });
    }),

    // Telemetry
    http.get(`${API_BASE_URL}/telemetry/readings`, () => {
        const generateData = (metric: string, min: number, max: number) => {
            return Array.from({ length: 24 }, (_, i) => ({
                timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
                value: min + Math.random() * (max - min),
                metric
            }));
        };
        return HttpResponse.json({
            data: {
                temperature: generateData('temperature', 18, 24),
                humidity: generateData('humidity', 60, 80),
                co2: generateData('co2', 400, 1200),
                ammonia: generateData('ammonia', 5, 15)
            }
        });
    }),

    // Alerts
    http.get(`${API_BASE_URL}/alerts`, () => {
        return HttpResponse.json({
            data: [
                { id: 'al1', alert_id: 'al1', message: 'High CO2 Concentration in Barn A', severity: 'critical', type: 'environment', occurred_at: new Date().toISOString(), status: 'active' },
                { id: 'al2', alert_id: 'al2', message: 'Gateway Hub #1 disconnected', severity: 'warning', type: 'system', occurred_at: new Date(Date.now() - 1800000).toISOString(), status: 'active' },
                { id: 'al3', alert_id: 'al3', message: 'Low Feed Level - Silo 2', severity: 'info', type: 'operation', occurred_at: new Date(Date.now() - 7200000).toISOString(), status: 'acknowledged', acknowledged_at: new Date(Date.now() - 3600000).toISOString() }
            ]
        });
    }),

    // Alerts Acknowledge
    http.post(`${API_BASE_URL}/alerts/:id/acknowledge`, () => {
        return HttpResponse.json({ ok: true });
    }),

    // AI Recommendations
    http.get(`${API_BASE_URL}/ai/recommendations`, () => {
        return HttpResponse.json({
            data: [
                { id: 'rec1', title: 'Optimize Ventilation', description: 'Early morning CO2 levels suggest increasing fan speed by 15% between 4 AM and 7 AM.', confidence: 0.92, category: 'environment' },
                { id: 'rec2', title: 'Feed Formulation Change', description: 'Current growth trend in Batch #44 indicates a 5% increase in lysine would improve FCR.', confidence: 0.85, category: 'feeding' },
                { id: 'rec3', title: 'Early Health Warning', description: 'Activity patterns in Barn C show a subtle decrease, possibly indicating early onset respiratory stress.', confidence: 0.78, category: 'health' }
            ]
        });
    }),

    // Reports
    http.get(`${API_BASE_URL}/reports`, () => {
        return HttpResponse.json({
            data: [
                { id: 'rep1', name: 'Weekly Production Summary', type: 'pdf', createdAt: new Date().toISOString(), size: '1.2 MB' },
                { id: 'rep2', name: 'Environmental Compliance Log', type: 'xlsx', createdAt: new Date(Date.now() - 86400000).toISOString(), size: '450 KB' },
                { id: 'rep3', name: 'FCR Analysis Q4', type: 'pdf', createdAt: new Date(Date.now() - 604800000).toISOString(), size: '3.8 MB' }
            ]
        });
    }),

    // Admin: Users
    http.get(`${API_BASE_URL}/admin/users`, () => {
        return HttpResponse.json({
            data: [
                { id: 'u1', name: 'Alice Smith', email: 'alice@farmiq.com', role: 'platform_admin', status: 'active' },
                { id: 'u2', name: 'Bob Johnson', email: 'bob@farmiq.com', role: 'farm_manager', status: 'active' },
                { id: 'u3', name: 'Charlie Davis', email: 'charlie@farmiq.com', role: 'operator', status: 'inactive' }
            ]
        });
    }),

    // Dashboard Overview
    http.get(`${API_BASE_URL}/dashboard/overview`, () => {
        return HttpResponse.json({
            data: {
                kpis: {
                    'Total Population': 12450,
                    'Active Batch': 12,
                    'Sensor Health': 98.4,
                    'Critical Alerts': 3
                },
                recent_alerts: [
                    { id: '1', message: 'Water Flow Low - Barn A', severity: 'critical', timestamp: new Date().toISOString() },
                    { id: '2', message: 'Temp Spike - Barn B', severity: 'warning', timestamp: new Date().toISOString() }
                ],
                recent_activity: [
                    { id: 'a1', type: 'weighing', description: 'Session 442 completed', timestamp: new Date().toISOString() },
                    { id: 'a2', type: 'alert', description: 'Sensor #99 restored', timestamp: new Date().toISOString() }
                ],
                weight_trend: [
                    { date: '2025-12-14', weight: 45.2 },
                    { date: '2025-12-15', weight: 46.8 },
                    { date: '2025-12-16', weight: 48.1 },
                    { date: '2025-12-17', weight: 49.5 },
                    { date: '2025-12-18', weight: 51.0 },
                    { date: '2025-12-19', weight: 52.6 },
                    { date: '2025-12-20', weight: 54.1 }
                ]
            }
        });
    }),
];
