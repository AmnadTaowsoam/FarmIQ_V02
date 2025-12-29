// Mock data for testing notifications feature
// Use this in development if BFF endpoints are not yet available

export const mockNotifications = [
    {
        notification_id: '1',
        tenant_id: 'tenant-1',
        farm_id: 'farm-001',
        barn_id: 'barn-001',
        severity: 'critical' as const,
        title: 'Critical Temperature Alert',
        message: 'Temperature in Barn A has exceeded safe limits (35°C). Immediate action required.',
        payload_json: {
            link: '/barns/barn-001',
            temperature: 35,
            threshold: 30,
        },
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
        read_at: null,
    },
    {
        notification_id: '2',
        tenant_id: 'tenant-1',
        farm_id: 'farm-001',
        barn_id: null,
        severity: 'warning' as const,
        title: 'Feed Stock Low',
        message: 'Feed stock for Farm 001 is running low. Reorder recommended within 48 hours.',
        payload_json: {
            link: '/feeding/lots',
            stock_level: 15,
        },
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        read_at: null,
    },
    {
        notification_id: '3',
        tenant_id: 'tenant-1',
        farm_id: 'farm-002',
        barn_id: 'barn-005',
        severity: 'info' as const,
        title: 'Batch Cycle Complete',
        message: 'Batch #2024-05 has completed its growth cycle. Ready for harvest.',
        payload_json: {
            link: '/barns/barn-005/batches',
            batch_id: '2024-05',
        },
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
        read_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // Read 3 hours ago
    },
    {
        notification_id: '4',
        tenant_id: 'tenant-1',
        farm_id: 'farm-001',
        barn_id: 'barn-002',
        severity: 'warning' as const,
        title: 'Device Offline',
        message: 'Sensor device SEN-042 in Barn B has been offline for 30 minutes.',
        payload_json: {
            link: '/devices/SEN-042',
            device_id: 'SEN-042',
        },
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
        read_at: null,
    },
    {
        notification_id: '5',
        tenant_id: 'tenant-1',
        farm_id: null,
        barn_id: null,
        severity: 'info' as const,
        title: 'System Maintenance Scheduled',
        message: 'Scheduled maintenance will occur on Dec 30, 2025 from 02:00-04:00 AM.',
        payload_json: {
            link: '/admin/ops/health',
        },
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        read_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), // Read 20 hours ago
    },
];

export const mockInboxResponse = {
    data: mockNotifications,
    total: mockNotifications.length,
    unread_count: mockNotifications.filter((n) => !n.read_at).length,
};

export const mockHistoryResponse = {
    data: mockNotifications,
    total: 50, // Simulate more items for pagination
    page: 1,
    page_size: 20,
};

export const mockUnreadCount = mockNotifications.filter((n) => !n.read_at).length;
