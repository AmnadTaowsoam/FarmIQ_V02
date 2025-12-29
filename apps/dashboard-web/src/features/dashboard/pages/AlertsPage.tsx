import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrapApiResponse } from '../../../api';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { PageHeader } from '../../../components/layout/PageHeader';
import { EmptyState } from '../../../components/EmptyState';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { StatusChip } from '../../../components/common/StatusChip';
import { Bell, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { BasicTable } from '../../../components/tables/BasicTable';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { useToast } from '../../../components/toast/useToast';
import type { components } from '@farmiq/api-client';

type Alert = components['schemas']['Alert'];

export const AlertsPage: React.FC = () => {
    const theme = useTheme();
    const toast = useToast();
    const { tenantId, farmId, barnId } = useActiveContext();
    const queryClient = useQueryClient();

    const { data: alerts = [], isLoading: loading, error, refetch } = useQuery<Alert[]>({
        queryKey: ['alerts', tenantId, farmId, barnId],
        queryFn: async () => {
            if (!tenantId) return [];
            // Alerts are served via the BFF dashboard aggregation endpoint
            const response = await apiClient.get<any>('/api/v1/dashboard/alerts', {
                params: {
                    tenantId,
                    farmId: farmId || undefined,
                    barnId: barnId || undefined,
                    limit: 100,
                },
            });
            const payload = response.data as any;
            const rawAlerts = payload?.data?.alerts ?? payload?.alerts ?? payload?.data ?? [];
            const list = Array.isArray(rawAlerts) ? rawAlerts : [];

            // Best-effort normalization across different downstream formats
            return list.map((item: any) => ({
                ...item,
                alert_id: item.alert_id || item.alertId || item.id,
                occurred_at: item.occurred_at || item.occurredAt || item.timestamp || item.createdAt,
                severity: item.severity || item.level || item.priority || 'info',
                status: item.status || item.state || 'active',
                message: item.message || item.title || item.description || '',
                type: item.type || item.category || 'system',
            })) as Alert[];
        },
        enabled: !!tenantId,
        initialData: []
    });

    const acknowledgeMutation = useMutation({
        mutationFn: async (alertId: string) => {
             // Optional: acknowledge is a BFF-level no-op in dev mode.
             await apiClient.post(`/api/v1/dashboard/alerts/${alertId}/acknowledge`, {
                 tenantId,
                 notes: 'Acknowledged from dashboard',
             });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            toast.success('Alert acknowledged successfully');
        },
        onError: () => {
            toast.error('Failed to acknowledge alert');
        }
    });

    const handleAcknowledge = (alertId?: string) => {
        if (alertId) acknowledgeMutation.mutate(alertId);
    };

    const columns: any[] = [
        { id: 'alert_id', label: 'Alert ID', format: (val: string) => <Typography variant="caption" fontWeight="600" sx={{ opacity: 0.6 }}>{val.split('-')[0]}...</Typography> },
        { 
            id: 'severity', 
            label: 'Severity',
            format: (val: string) => <StatusChip status={val === 'critical' ? 'error' : val === 'warning' ? 'warning' : 'info'} label={val?.toUpperCase()} />
        },
        { id: 'type', label: 'Type', format: (val: string) => <Typography variant="body2" fontWeight="600" sx={{ textTransform: 'capitalize' }}>{val.replace('_', ' ')}</Typography> },
        { id: 'message', label: 'Message' },
        {
            id: 'occurred_at',
            label: 'Occurred',
            format: (value: string) => value ? new Date(value).toLocaleString() : '—',
        },
        {
            id: 'status',
            label: 'Action Status',
            format: (val: string) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {val === 'acknowledged' ? <CheckCircle2 size={16} color={theme.palette.success.main} /> : <ShieldAlert size={16} color={theme.palette.warning.main} />}
                    <Typography variant="body2" fontWeight="600" color={val === 'acknowledged' ? 'success.main' : 'warning.main'}>
                        {val?.toUpperCase()}
                    </Typography>
                </Box>
            )
        },
        {
            id: 'acknowledged_at',
            label: 'Quick Action',
            format: (_value: any, row: any) => (
                <Button
                    size="small"
                    variant="text"
                    disabled={row.status === 'acknowledged'}
                    onClick={(event) => {
                        event.stopPropagation();
                        handleAcknowledge(row.alert_id);
                    }}
                    sx={{ fontWeight: 700, borderRadius: 1.5 }}
                >
                    {row.status === 'acknowledged' ? 'Solved' : 'Acknowledge'}
                </Button>
            ),
        },
    ];

    if (error) return <ErrorState title="Failed to load alerts" message={error.message} onRetry={() => refetch()} />;
    
    if (loading && alerts.length === 0) {
        return (
            <Box>
                <PageHeader
                    title="Alerts & Notifications"
                    subtitle="Centralized management for system alerts, operational incidents, and anomaly detections"
                />
                <LoadingCard title="Loading alerts..." lines={4} />
            </Box>
        );
    }

    return (
        <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
            <PageHeader 
                title="Alerts & Notifications" 
                subtitle="Centralized management for system alerts, operational incidents, and anomaly detections" 
                primaryAction={{
                    label: 'Mute System',
                    onClick: () => toast.info('System muting is not implemented in mock mode'),
                    variant: 'outlined'
                }}
            />
            {alerts.length === 0 ? (
                <EmptyState 
                    icon={<Bell size={32} />} 
                    title="All Systems Operational" 
                    description="No unresolved alerts found for the current workspace. You are all set!" 
                />
            ) : (
                <PremiumCard noPadding sx={{ mt: 1 }}>
                    <BasicTable columns={columns} data={alerts} loading={loading} rowKey="alert_id" />
                </PremiumCard>
            )}
        </Box>
    );
};
