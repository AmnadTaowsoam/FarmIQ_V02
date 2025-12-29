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

export const FarmDetailPage: React.FC = () => {
    const theme = useTheme();
    const { id } = useParams<{ id: string }>();
    const { data: farm, isLoading, error, refetch } = useFarmData(id);
    const { tenantId } = useActiveContext();
    const [devices, setDevices] = useState<Device[]>([]);
    const [barns, setBarns] = useState<BarnSummary[]>([]);
    const [devicesLoading, setDevicesLoading] = useState(false);
    const [barnsLoading, setBarnsLoading] = useState(false);

    useEffect(() => {
        const fetchDevices = async () => {
            if (!tenantId || !id) return;
            setDevicesLoading(true);
            try {
                const response = await api.devices.list({
                    tenantId,
                    farmId: id,
                    page: 1,
                    pageSize: 50,
                });
                const devicesResponse = unwrapApiResponse<Device[]>(response) || [];
                setDevices(devicesResponse);
            } catch (err) {
                console.error('Failed to load devices', err);
                setDevices([]);
            } finally {
                setDevicesLoading(false);
            }
        };

        const fetchBarns = async () => {
            if (!tenantId || !id) return;
            setBarnsLoading(true);
            try {
                const response = await api.barns.list({
                    tenantId,
                    farmId: id,
                    page: 1,
                    pageSize: 50,
                });
                const barnsResponse = unwrapApiResponse<BarnSummary[]>(response) || [];
                setBarns(barnsResponse);
            } catch (err) {
                console.error('Failed to load barns', err);
                setBarns([]);
            } finally {
                setBarnsLoading(false);
            }
        };

        fetchDevices();
        fetchBarns();
    }, [tenantId, id]);

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
                    { label: 'Registered Barns', value: farm.barn_count || 0, icon: <Warehouse size={24} />, color: 'primary.main' },
                    { label: 'Active Devices', value: farm.device_count || 0, icon: <Activity size={24} />, color: 'secondary.main' },
                    { label: 'Last System Activity', value: farm.last_activity ? new Date(farm.last_activity).toLocaleDateString() : '—', icon: <RefreshCw size={24} />, color: 'info.main' },
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
                        <BasicTable<BarnSummary>
                            columns={[
                                { id: 'barn_id', label: 'Barn ID' },
                                { id: 'name', label: 'Name' },
                                { id: 'device_count', label: 'Devices', align: 'right' },
                            ]}
                            data={barns}
                            loading={barnsLoading}
                            rowKey="barn_id"
                        />
                    </PremiumCard>
                </Grid>

                <Grid item xs={12} md={6}>
                    <PremiumCard title="Connected Devices" sx={{ height: '100%' }}>
                        <BasicTable<Device>
                            columns={[
                                { id: 'device_id', label: 'Device ID' },
                                { id: 'name', label: 'Name' },
                                { id: 'type', label: 'Type' },
                                { id: 'status', label: 'Status' },
                                {
                                    id: 'last_seen',
                                    label: 'Last Seen',
                                    format: (value) => value ? new Date(value).toLocaleDateString() : '—',
                                },
                            ]}
                            data={devices}
                            loading={devicesLoading}
                            rowKey="device_id"
                        />
                    </PremiumCard>
                </Grid>
            </Grid>
        </Box>
    );
};
