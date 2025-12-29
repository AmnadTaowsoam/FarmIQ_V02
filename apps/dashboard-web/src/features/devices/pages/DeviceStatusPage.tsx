import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrapApiResponse } from '../../../api';
import { Box, Typography, Grid, Card, CardContent, Stack, TextField, MenuItem, alpha, useTheme } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/EmptyState';
import { Server, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { StatusChip } from '../../../components/common/StatusChip';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { queryKeys, DEFAULT_STALE_TIME } from '../../../services/queryKeys';
import type { components } from '@farmiq/api-client';
import { useNavigate } from 'react-router-dom';

type Device = components['schemas']['Device'];

type DeviceStatus = 'online' | 'offline' | 'warning';

export const DeviceStatusPage: React.FC = () => {
    const theme = useTheme();
    const { tenantId, farmId, barnId } = useActiveContext();
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    const { data: devices = [], isLoading: loading, error } = useQuery<Device[]>({
        queryKey: queryKeys.devices.all({ tenantId: tenantId || undefined, farmId: farmId || undefined, barnId: barnId || undefined }),
        queryFn: async () => {
             if (!tenantId) return [];
             const response = await api.devices.list({
                 tenantId,
                 farmId: farmId || undefined,
                 barnId: barnId || undefined,
                 page: 1,
                 pageSize: 100,
             });
            const devicesResponse = unwrapApiResponse<any[]>(response) || [];
            return devicesResponse.map((device) => ({
                ...device,
                device_id: device.id,
                name: device.serialNo || device.id,
                type: device.deviceType,
                last_seen: device.updatedAt,
            }));
        },
        enabled: !!tenantId,
        staleTime: DEFAULT_STALE_TIME,
        initialData: []
    });

    // Calculate device status based on last_seen
    const getDeviceStatus = (device: Device): DeviceStatus => {
        if (!device.last_seen) return 'offline';
        const lastSeen = new Date(device.last_seen);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
        
        if (diffMinutes < 5) return 'online';
        if (diffMinutes < 30) return 'warning';
        return 'offline';
    };

    // Calculate statistics
    const stats = useMemo(() => {
        const online = devices.filter(d => getDeviceStatus(d) === 'online').length;
        const warning = devices.filter(d => getDeviceStatus(d) === 'warning').length;
        const offline = devices.filter(d => getDeviceStatus(d) === 'offline').length;
        return { online, warning, offline, total: devices.length };
    }, [devices]);

    // Filter devices
    const filteredDevices = useMemo(() => {
        let filtered = devices;
        
        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(d => getDeviceStatus(d) === statusFilter);
        }
        
        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(d => 
                d.device_id?.toLowerCase().includes(query) ||
                d.name?.toLowerCase().includes(query) ||
                d.type?.toLowerCase().includes(query)
            );
        }
        
        return filtered;
    }, [devices, statusFilter, searchQuery]);

    if (loading) {
        return (
            <Box>
                <PageHeader
                    title="Device Status"
                    subtitle="Maintenance and heartbeat overview for connected hardware"
                />
                <LoadingCard title="Loading device status" lines={3} />
            </Box>
        );
    }
    
    if (error) {
        const isServerError = (error as any)?.response?.status >= 500;
        return (
            <Box>
                <PageHeader
                    title="Device Status"
                    subtitle="Maintenance and heartbeat overview for connected hardware"
                />
                <ErrorState 
                    title={isServerError ? "Backend Unavailable" : "Failed to load device status"} 
                    message={isServerError ? "The device service is temporarily unavailable. Please try again." : (error as Error).message}
                    onRetry={() => window.location.reload()}
                />
            </Box>
        );
    }

    if (devices.length === 0) {
        return (
            <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
                <PageHeader
                    title="Device Status"
                    subtitle="Maintenance and heartbeat overview for connected hardware"
                />
                <EmptyState 
                    icon={<Server size={32} />} 
                    title="No Devices Found" 
                    description="No devices are currently linked to this tenant context."
                />
            </Box>
        );
    }

    return (
        <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
            <PageHeader 
                title="Device Status" 
                subtitle="Maintenance and heartbeat overview for connected hardware"
            />

            {/* Status Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        border: '2px solid',
                        borderColor: theme.palette.success.main,
                        bgcolor: alpha(theme.palette.success.main, 0.05)
                    }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box sx={{ 
                                    p: 1.5, 
                                    borderRadius: 2, 
                                    bgcolor: alpha(theme.palette.success.main, 0.1),
                                    display: 'flex'
                                }}>
                                    <CheckCircle size={24} color={theme.palette.success.main} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" fontWeight="700" color="success.main">
                                        {stats.online}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Online
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        border: '2px solid',
                        borderColor: theme.palette.warning.main,
                        bgcolor: alpha(theme.palette.warning.main, 0.05)
                    }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box sx={{ 
                                    p: 1.5, 
                                    borderRadius: 2, 
                                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                                    display: 'flex'
                                }}>
                                    <AlertCircle size={24} color={theme.palette.warning.main} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" fontWeight="700" color="warning.main">
                                        {stats.warning}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Warning
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        border: '2px solid',
                        borderColor: theme.palette.error.main,
                        bgcolor: alpha(theme.palette.error.main, 0.05)
                    }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box sx={{ 
                                    p: 1.5, 
                                    borderRadius: 2, 
                                    bgcolor: alpha(theme.palette.error.main, 0.1),
                                    display: 'flex'
                                }}>
                                    <Activity size={24} color={theme.palette.error.main} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" fontWeight="700" color="error.main">
                                        {stats.offline}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Offline
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        border: '2px solid',
                        borderColor: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.05)
                    }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box sx={{ 
                                    p: 1.5, 
                                    borderRadius: 2, 
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    display: 'flex'
                                }}>
                                    <Server size={24} color={theme.palette.primary.main} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" fontWeight="700" color="primary.main">
                                        {stats.total}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Devices
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <PremiumCard sx={{ mb: 3, p: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        placeholder="Search devices..."
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ flexGrow: 1 }}
                    />
                    <TextField
                        select
                        size="small"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="all">All Status</MenuItem>
                        <MenuItem value="online">Online</MenuItem>
                        <MenuItem value="warning">Warning</MenuItem>
                        <MenuItem value="offline">Offline</MenuItem>
                    </TextField>
                </Stack>
            </PremiumCard>

            {/* Device List */}
            <Grid container spacing={2}>
                {filteredDevices.map((device) => {
                    const status = getDeviceStatus(device);
                    const statusConfig = {
                        online: { color: 'success' as const, icon: CheckCircle, label: 'ONLINE' },
                        warning: { color: 'warning' as const, icon: AlertCircle, label: 'WARNING' },
                        offline: { color: 'error' as const, icon: Activity, label: 'OFFLINE' }
                    }[status];

                    return (
                        <Grid item xs={12} md={6} lg={4} key={device.device_id}>
                            <PremiumCard 
                                sx={{ 
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: 4
                                    }
                                }}
                                onClick={() => navigate(`/devices/${device.device_id}`)}
                            >
                                <Stack spacing={2}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                        <Box>
                                            <Typography variant="h6" fontWeight="600">
                                                {device.name || device.device_id}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {device.device_id}
                                            </Typography>
                                        </Box>
                                        <StatusChip 
                                            status={statusConfig.color} 
                                            label={statusConfig.label}
                                        />
                                    </Stack>

                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Server size={16} color={theme.palette.text.secondary} />
                                        <Typography variant="body2" color="text.secondary">
                                            {device.type || 'Unknown Type'}
                                        </Typography>
                                    </Stack>

                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Clock size={16} color={theme.palette.text.secondary} />
                                        <Typography variant="body2" color="text.secondary">
                                            Last seen: {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </PremiumCard>
                        </Grid>
                    );
                })}
            </Grid>

            {filteredDevices.length === 0 && (
                <EmptyState 
                    icon={<Server size={32} />} 
                    title="No Devices Match Filters" 
                    description="Try adjusting your search or filter criteria."
                />
            )}
        </Box>
    );
};
