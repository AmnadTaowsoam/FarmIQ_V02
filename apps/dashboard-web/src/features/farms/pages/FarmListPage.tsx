import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Grid, Typography, Stack, alpha, useTheme, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Warehouse, MapPin, Activity } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { LoadingCard } from '../../../components/LoadingCard';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { EmptyState } from '../../../components/EmptyState';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { api, unwrapApiResponse } from '../../../api';
import { queryKeys, DEFAULT_STALE_TIME } from '../../../services/queryKeys';
import { StatusChip } from '../../../components/common/StatusChip';
import { PremiumCard } from '../../../components/common/PremiumCard';
import type { components } from '@farmiq/api-client';

type Farm = components['schemas']['Farm'];

export const FarmListPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { tenantId } = useActiveContext();

    const { data: farms, isLoading: loading, error } = useQuery<Farm[]>({
        queryKey: queryKeys.farms.all(tenantId || undefined),
        queryFn: async () => {
            if (!tenantId) return [];
            const response = await api.farms.list({ tenantId, page: 1, pageSize: 100 });
            // Handle both wrapped and unwrapped responses
            let farmsData = response.data;
            if (farmsData && typeof farmsData === 'object' && 'data' in farmsData) {
                farmsData = (farmsData as any).data;
            }
            const farmsArray = Array.isArray(farmsData) ? farmsData : [];
            return farmsArray.map((farm) => ({
                ...farm,
                farm_id: farm.farm_id || farm.id,
                barn_count: farm.barn_count ?? farm.barns?.length ?? 0,
            }));
        },
        enabled: !!tenantId,
        staleTime: DEFAULT_STALE_TIME,
        refetchOnWindowFocus: false, // Prevent refetch on window focus to avoid flickering
        initialData: []
    });

    if (loading) {
        return (
            <Box>
                <PageHeader title="Farms" subtitle="Manage your farm locations" />
                <LoadingCard title="Loading farms" lines={3} />
            </Box>
        );
    }
    
    if (error) {
        const isServerError = (error as any)?.response?.status >= 500;
        return (
            <Box>
                <PageHeader title="Farms" subtitle="Manage your farm locations" />
                <ErrorState 
                    title={isServerError ? "Backend Unavailable" : "Failed to load farms"} 
                    message={isServerError ? "The farm service is temporarily unavailable. Please try again." : error.message}
                    onRetry={() => queryClient.invalidateQueries({ queryKey: ['farms', tenantId] })}
                />
            </Box>
        );
    }
    
    if (!farms.length) {
        return (
            <Box>
                <PageHeader title="Farms" subtitle="Manage your farm locations" />
                <EmptyState title="No farms found" description="No farms are available for this tenant context." />
            </Box>
        );
    }

    return (
        <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
            <PageHeader 
                title="Farms" 
                subtitle="Manage your agricultural property locations and assets" 
                actions={[
                    { label: 'Create Farm', variant: 'contained', startIcon: <Warehouse size={18} />, onClick: () => navigate('/farms/new') }
                ]}
            />
            
            <Grid container spacing={3}>
                {farms.map((farm, index) => (
                    <Grid item xs={12} sm={6} md={4} key={farm.farm_id} sx={{ animation: `fadeIn 0.4s ease-out ${index * 0.1}s both` }}>
                        <PremiumCard 
                            hoverable
                            noPadding
                            sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                            onClick={() => navigate(`/farms/${farm.farm_id}`)}
                        >
                            <Box sx={{ p: 3, flexGrow: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                    <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', borderRadius: 2 }}>
                                        <Warehouse size={28} />
                                    </Box>
                                    <StatusChip 
                                        status={farm.status === 'active' ? 'success' : 'info'} 
                                        label={(farm.status || 'Active').toUpperCase()} 
                                    />
                                </Box>
                                
                                <Typography variant="h5" fontWeight="700" gutterBottom>{farm.name || farm.farm_id}</Typography>
                                
                                <Stack spacing={1.5} sx={{ mt: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                                        <MapPin size={18} />
                                        <Typography variant="body2">{farm.location || 'Central Valley'}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                                        <Activity size={18} />
                                        <Typography variant="body2">{farm.barn_count || 0} barns registered</Typography>
                                    </Box>
                                </Stack>
                            </Box>
                            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                                <Button fullWidth variant="text" sx={{ borderRadius: 1.5, color: 'text.secondary', fontWeight: 600 }}>
                                    View Details
                                </Button>
                            </Box>
                        </PremiumCard>
                    </Grid>
                ))}
            </Grid>

        </Box>
    );
};
