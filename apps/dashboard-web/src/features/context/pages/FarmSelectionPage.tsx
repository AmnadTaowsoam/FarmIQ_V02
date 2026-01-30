import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Grid, Button, alpha, useTheme, Stack, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { StatusChip } from '../../../components/common/StatusChip';
import { Warehouse, MapPin, Activity } from 'lucide-react';
import { api, unwrapApiResponse } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { LoadingCard } from '../../../components/LoadingCard';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/EmptyState';
import { queryKeys } from '../../../services/queryKeys';
import type { components } from '@farmiq/api-client';

type Farm = components['schemas']['Farm'];

export const FarmSelectionPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { tenantId, setFarmId } = useActiveContext();
    const [overrideFarmId, setOverrideFarmId] = React.useState<string>(
        import.meta.env.VITE_DEFAULT_FARM_ID || ''
    );
    const isDev = import.meta.env.DEV;

    const { data: farmsResponse = [], isLoading, error, refetch } = useQuery({
        queryKey: tenantId ? queryKeys.farms.byTenant(tenantId) : ['farms', 'by-tenant'],
        queryFn: async () => {
            if (!tenantId) return [];
            const response = await api.farms.list({ tenantId, page: 1, pageSize: 100 });
            const farms = unwrapApiResponse<any[]>(response) || [];
            const normalized = farms.map((farm) => ({
                ...farm,
                farm_id: farm.farm_id || (farm as any).id,
            }));
            return normalized;
        },
        enabled: !!tenantId,
        retry: 1,
    });

    const farms = farmsResponse || [];
    
    const handleSelect = (farmId: string) => {
        setFarmId(farmId);
        navigate('/overview');
    };
    
    if (!tenantId) {
        return (
            <Box>
                <PageHeader title="Select Farm" subtitle="Choose the farm you wish to monitor" />
                <EmptyState
                    title="No tenant selected"
                    description="Please select a tenant before choosing a farm."
                    actionLabel="Select Tenant"
                    onAction={() => navigate('/select-tenant')}
                />
            </Box>
        );
    }
    
    if (isLoading) {
        return (
            <Box>
                <PageHeader title="Select Farm" subtitle="Choose the farm you wish to monitor" />
                <LoadingCard title="Loading farms" lines={3} />
            </Box>
        );
    }
    
    if (error) {
        return (
            <Box>
                <PageHeader title="Select Farm" subtitle="Choose the farm you wish to monitor" />
                <ErrorState title="Failed to load farms" message={error instanceof Error ? error.message : 'Unknown error'} onRetry={() => refetch()} />
                {isDev ? (
                    <PremiumCard sx={{ mt: 3 }}>
                        <Typography variant="h6" fontWeight="700" gutterBottom>
                            Developer override
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            The farm service is unavailable. Enter a farm ID to continue in dev mode.
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                            <TextField
                                label="Developer farm ID"
                                value={overrideFarmId}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setOverrideFarmId(event.target.value)}
                                placeholder="farm-id"
                                fullWidth
                            />
                            <Button
                                variant="contained"
                                onClick={() => {
                                    if (!overrideFarmId.trim()) return;
                                    handleSelect(overrideFarmId.trim());
                                }}
                                sx={{ minWidth: 180 }}
                            >
                                Use this farmId
                            </Button>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Tip: set `VITE_DEFAULT_FARM_ID` to auto-apply on load.
                        </Typography>
                    </PremiumCard>
                ) : null}
            </Box>
        );
    }
    
    if (!farms.length) {
        return (
            <Box>
                <PageHeader title="Select Farm" subtitle="Choose the farm you wish to monitor" />
                <EmptyState title="No farms available" description="Register a farm to get started." actionLabel="Retry" onAction={() => refetch()} />
            </Box>
        );
    }
    
    return (
        <Box>
            <PageHeader
                title="Select Farm"
                subtitle={`Choose the farm you wish to monitor for ${tenantId || 'selected tenant'}`}
            />
            
            <Grid container spacing={3} sx={{ animation: 'fadeIn 0.6s ease-out' }}>
                {farms.map((farm, index) => (
                    <Grid item xs={12} sm={6} md={4} key={farm.farm_id || farm.name} sx={{ animation: `fadeIn 0.4s ease-out ${index * 0.1}s both` }}>
                        <PremiumCard
                            hoverable
                            noPadding
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                            onClick={() => farm.farm_id && handleSelect(farm.farm_id)}
                        >
                            <Box sx={{ p: 3, flexGrow: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                    <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', borderRadius: 2 }}>
                                        <Warehouse size={28} />
                                    </Box>
                                    <StatusChip
                                        status={farm.status === 'active' ? 'success' : farm.status === 'warning' ? 'warning' : 'info'}
                                        label={(farm.status || 'Active').toUpperCase()}
                                    />
                                </Box>
                                
                                <Typography variant="h5" fontWeight="700" gutterBottom>
                                    {farm.name || farm.farm_id}
                                </Typography>
                                
                                <Stack spacing={1.5} sx={{ mt: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                                        <MapPin size={18} />
                                        <Typography variant="body2">{farm.location || 'Central Valley'}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                                        <Activity size={18} />
                                        <Typography variant="body2">{farm.barn_count || 0} Registered Barns</Typography>
                                    </Box>
                                </Stack>
                            </Box>
                            <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                                <Button fullWidth variant="outlined" sx={{ borderRadius: 10, py: 1 }} endIcon={<Activity size={16} />}>
                                    Access Dashboard
                                </Button>
                            </Box>
                        </PremiumCard>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};
