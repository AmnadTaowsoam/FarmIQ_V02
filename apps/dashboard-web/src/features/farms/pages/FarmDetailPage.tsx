import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Grid, Box, Typography, alpha, useTheme } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { useFarmData } from '../../../hooks/useFarmData';
import { LoadingCard } from '../../../components/LoadingCard';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { RefreshCw, Warehouse, Activity } from 'lucide-react';
import { BasicTable } from '../../../components/tables/BasicTable';
import { EmptyState } from '../../../components/EmptyState';

import { api, unwrapApiResponse } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import type { components } from '@farmiq/api-client';

type Device = components['schemas']['Device'];
type BarnSummary = components['schemas']['BarnSummary'];
type UiBarn = { id: string; name: string; deviceCount: number };
type UiDevice = { id: string; name: string; type: string; status: string; lastSeen?: string | null };

export const FarmDetailPage: React.FC = () => {
    const theme = useTheme();
    const { farmId } = useParams<{ farmId: string }>();
    const { data: farm, isLoading, error, refetch } = useFarmData(farmId);
    const { tenantId } = useActiveContext();
    const [devices, setDevices] = useState<UiDevice[]>([]);
    const [barns, setBarns] = useState<UiBarn[]>([]);
    const [devicesLoading, setDevicesLoading] = useState(false);
    const [barnsLoading, setBarnsLoading] = useState(false);

    useEffect(() => {
        const fetchDevices = async () => {
            if (!tenantId || !farmId) return;
            setDevicesLoading(true);
            try {
                const response = await api.devices.list({
                    tenantId,
                    farmId,
                    page: 1,
                    pageSize: 50,
                });
                const devicesResponse = unwrapApiResponse<Device[]>(response) || [];
                const mappedDevices: UiDevice[] = devicesResponse.map((d: any) => ({
                    id: d.device_id || d.id || '—',
                    name: d.name || d?.metadata?.name || d.serialNo || d.serial_no || '—',
                    type: d.type || d.deviceType || d.device_type || '—',
                    status: d.status || '—',
                    lastSeen: d.last_seen || d.lastHello || d.last_hello || null,
                }));
                setDevices(mappedDevices);
            } catch (err) {
                console.error('Failed to load devices', err);
                setDevices([]);
            } finally {
                setDevicesLoading(false);
            }
        };

        const fetchBarns = async () => {
            if (!tenantId || !farmId) return;
            setBarnsLoading(true);
            try {
                const response = await api.barns.list({
                    tenantId,
                    farmId,
                    page: 1,
                    pageSize: 50,
                });
                const barnsResponse = unwrapApiResponse<BarnSummary[]>(response) || [];
                const mappedBarns: UiBarn[] = barnsResponse.map((b: any) => ({
                    id: b.barn_id || b.id || '—',
                    name: b.name || '—',
                    deviceCount:
                        typeof b.device_count === 'number'
                            ? b.device_count
                            : Array.isArray(b.devices)
                              ? b.devices.length
                              : 0,
                }));
                setBarns(mappedBarns);
            } catch (err) {
                console.error('Failed to load barns', err);
                setBarns([]);
            } finally {
                setBarnsLoading(false);
            }
        };

        fetchDevices();
        fetchBarns();
    }, [tenantId, farmId]);

    if (isLoading) {
        return (
            <Box>
                <PageHeader title="Farm Detail" subtitle="Loading farm information" />
                <LoadingCard title="Loading farm details" lines={4} />
            </Box>
        );
    }
    if (error) return <ErrorState title="Failed to load farm" message={error.message} onRetry={refetch} />;
    if (!farm) {
        return (
            <Box>
                <PageHeader title="Farm Detail" subtitle="Farm information" />
                <EmptyState title="Farm not found" description="We could not find this farm in the current tenant." />
            </Box>
        );
    }

    const farmAny = farm as any;
    const registeredBarns =
        typeof farmAny.barn_count === 'number'
            ? farmAny.barn_count
            : Array.isArray(farmAny.barns)
              ? farmAny.barns.length
              : barns.length;
    const activeDevices =
        typeof farmAny.device_count === 'number'
            ? farmAny.device_count
            : Array.isArray(farmAny.devices)
              ? farmAny.devices.length
              : devices.length;
    const lastActivityRaw = farmAny.last_activity || farmAny.updatedAt || farmAny.updated_at;
    const lastActivity = lastActivityRaw ? new Date(lastActivityRaw).toLocaleDateString() : '—';

    return (
        <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
            <PageHeader 
                title={farm.name || 'Farm Detail'} 
                subtitle={`Operational hub for ${farm.location || 'Unknown Region'}`}
                actions={[
                    { 
                        label: 'Sync Data', 
                        onClick: refetch,
                        startIcon: <RefreshCw size={18} />,
                        variant: 'outlined'
                    },
                    {
                        label: 'Edit Farm',
                        variant: 'contained',
                        onClick: () => {}
                    }
                ]}
            />

            <Grid container spacing={3}>
                {[
                    { label: 'Registered Barns', value: registeredBarns, icon: <Warehouse size={24} />, color: 'primary.main' },
                    { label: 'Active Devices', value: activeDevices, icon: <Activity size={24} />, color: 'secondary.main' },
                    { label: 'Last System Activity', value: lastActivity, icon: <RefreshCw size={24} />, color: 'info.main' },
                ].map((stat, idx) => (
                    <Grid item xs={12} md={4} key={idx} sx={{ animation: `fadeIn 0.4s ease-out ${idx * 0.1}s both` }}>
                        <PremiumCard 
                            sx={{ 
                                p: 1, 
                                bgcolor: alpha(theme.palette.background.paper, 0.4),
                                backdropFilter: 'blur(10px)',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ 
                                    p: 1.5, 
                                    bgcolor: alpha(stat.color.split('.')[0] === 'primary' ? theme.palette.primary.main : stat.color.split('.')[0] === 'secondary' ? theme.palette.secondary.main : theme.palette.info.main, 0.1), 
                                    color: stat.color,
                                    borderRadius: 2
                                }}>
                                    {stat.icon}
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        {stat.label}
                                    </Typography>
                                    <Typography variant="h4" fontWeight="800">
                                        {stat.value}
                                    </Typography>
                                </Box>
                            </Box>
                        </PremiumCard>
                    </Grid>
                ))}

                <Grid item xs={12} md={6}>
                    <PremiumCard title="Barn Inventory" sx={{ height: '100%' }}>
                        <BasicTable<UiBarn>
                            columns={[
                                { id: 'id', label: 'Barn ID' },
                                { id: 'name', label: 'Name' },
                                { id: 'deviceCount', label: 'Devices', align: 'right' },
                            ]}
                            data={barns}
                            loading={barnsLoading}
                            rowKey="id"
                        />
                    </PremiumCard>
                </Grid>

                <Grid item xs={12} md={6}>
                    <PremiumCard title="Connected Devices" sx={{ height: '100%' }}>
                        <BasicTable<UiDevice>
                            columns={[
                                { id: 'id', label: 'Device ID' },
                                { id: 'name', label: 'Name' },
                                { id: 'type', label: 'Type' },
                                { id: 'status', label: 'Status' },
                                {
                                    id: 'lastSeen',
                                    label: 'Last Seen',
                                    format: (value) => value ? new Date(value).toLocaleDateString() : '—',
                                },
                            ]}
                            data={devices}
                            loading={devicesLoading}
                            rowKey="id"
                        />
                    </PremiumCard>
                </Grid>
            </Grid>
        </Box>
    );
};
