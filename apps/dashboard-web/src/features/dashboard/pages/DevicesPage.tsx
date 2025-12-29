import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrapApiResponse } from '../../../api';
import { Box, Typography } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/EmptyState';
import { Server } from 'lucide-react';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { StatusChip } from '../../../components/common/StatusChip';
import { BasicTable } from '../../../components/tables/BasicTable';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { queryKeys, DEFAULT_STALE_TIME } from '../../../services/queryKeys';
import type { components } from '@farmiq/api-client';
import { useNavigate } from 'react-router-dom';

type Device = components['schemas']['Device'];

export const DevicesPage: React.FC = () => {
    const { tenantId, farmId, barnId } = useActiveContext();
    const navigate = useNavigate();
    
    console.log('[DevicesPage] Context values:', { tenantId, farmId, barnId });
    
    const { data: devices = [], isLoading: loading, error } = useQuery<Device[]>({
        queryKey: queryKeys.devices.all({ tenantId: tenantId || undefined, farmId: farmId || undefined, barnId: barnId || undefined }),
        queryFn: async () => {
             console.log('[DevicesPage] queryFn called with tenantId:', tenantId);
             if (!tenantId) {
                 console.log('[DevicesPage] No tenantId, returning empty array');
                 return [];
             }
             const response = await api.devices.list({
                 tenantId,
                 farmId: farmId || undefined,
                 barnId: barnId || undefined,
                 page: 1,
                 pageSize: 50,
             });
            console.log('[DevicesPage] API response:', response);
            const devicesResponse = unwrapApiResponse<any[]>(response) || [];
            console.log('[DevicesPage] Unwrapped devices:', devicesResponse);
            const mappedDevices = devicesResponse.map((device) => ({
                ...device,
                device_id: device.id,
                name: device.serialNo || device.id,
                type: device.deviceType,
                last_seen: device.updatedAt,
            }));
            console.log('[DevicesPage] Mapped devices:', mappedDevices);
            return mappedDevices;
        },
        enabled: !!tenantId,
        staleTime: DEFAULT_STALE_TIME,
        refetchOnMount: true,
    });

    const columns: any[] = [
        { id: 'device_id', label: 'Device ID', format: (val: string) => <Typography variant="body2" fontWeight="600">{val}</Typography> },
        { id: 'name', label: 'Name' },
        { id: 'type', label: 'Type' },
        { 
            id: 'status', 
            label: 'Status',
            format: (val: string) => <StatusChip status={val === 'active' ? 'success' : val === 'warning' ? 'warning' : 'info'} label={val?.toUpperCase()} />
        },
        {
            id: 'last_seen',
            label: 'Last Seen',
            format: (value: string) => value ? new Date(value).toLocaleString() : '—',
        },
    ];

    if (loading) {
        return (
            <Box>
                <PageHeader
                    title="Device Registry"
                    subtitle="Manage and monitor all provisioned IoT hardware across your infrastructure"
                />
                <LoadingCard title="Loading devices" lines={3} />
            </Box>
        );
    }
    
    if (error) {
        const isServerError = (error as any)?.response?.status >= 500;
        return (
            <Box>
                <PageHeader
                    title="Device Registry"
                    subtitle="Manage and monitor all provisioned IoT hardware across your infrastructure"
                />
                <ErrorState 
                    title={isServerError ? "Backend Unavailable" : "Failed to load devices"} 
                    message={isServerError ? "The device service is temporarily unavailable. Please try again." : error.message}
                    onRetry={() => window.location.reload()}
                />
            </Box>
        );
    }

    return (
        <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
            <PageHeader 
                title="Device Registry" 
                subtitle="Manage and monitor all provisioned IoT hardware across your infrastructure"
                actions={[
                    { label: 'Provision Device', variant: 'contained', startIcon: <Server size={18} />, onClick: () => {} }
                ]}
            />
            {devices.length === 0 ? (
                <EmptyState 
                    icon={<Server size={32} />} 
                    title="No Devices Found" 
                    description="No devices are currently linked to this tenant context."
                />
            ) : (
                <PremiumCard noPadding>
                    <BasicTable
                        columns={columns}
                        data={devices}
                        rowKey="device_id"
                        onRowClick={(row) => navigate(`/devices/${row.device_id}`)}
                    />
                </PremiumCard>
            )}
        </Box>
    );
};
