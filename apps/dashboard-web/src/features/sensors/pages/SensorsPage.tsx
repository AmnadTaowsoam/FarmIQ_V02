import React from 'react';
import { Box, Grid, Typography, alpha, useTheme, Stack } from '@mui/material';
import { RefreshCw, AlertTriangle, Cpu } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { StatusChip } from '../../../components/common/StatusChip';
import { useSensors, TelemetrySensor } from '../../../hooks/useSensors';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { EmptyState } from '../../../components/EmptyState';

const SensorCard: React.FC<{ sensor: TelemetrySensor }> = ({ sensor }) => {
    const theme = useTheme();
    const status = sensor.metrics?.some((m) => m.status === 'critical') ? 'critical' : (sensor.metrics?.[0]?.status || 'unknown');
    
    return (
        <PremiumCard 
            hoverable 
            sx={{ 
                height: '100%',
                bgcolor: alpha(status === 'critical' ? theme.palette.error.main : theme.palette.background.paper, 0.05),
                border: `1px solid ${alpha(status === 'critical' ? theme.palette.error.main : theme.palette.divider, 0.2)}`,
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                        <Cpu size={20} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight="800" sx={{ lineHeight: 1.2 }}>
                            {sensor.device_name || 'Generic Sensor'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ opacity: 0.7 }}>
                            {(sensor.device_id || '').split('-')[0] || 'HW'}...
                        </Typography>
                    </Box>
                </Box>
                <StatusChip 
                    status={status === 'online' ? 'success' : status === 'warning' ? 'warning' : status === 'critical' ? 'error' : 'info'} 
                    label={status.toUpperCase()} 
                />
            </Box>
            
            <Stack spacing={1.5}>
                {(sensor.metrics || []).map((metric) => (
                    <Box key={metric.metric_type} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.text.primary, 0.03) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase' }}>
                                {metric.metric_type}
                            </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="800" color={metric.status === 'critical' ? 'error.main' : 'text.primary'}>
                            {metric.value !== undefined ? `${metric.value} ${metric.unit || ''}` : '—'}
                        </Typography>
                    </Box>
                ))}
            </Stack>
        </PremiumCard>
    );
};

export const SensorsPage: React.FC = () => {
    const { sensors, loading, error, refetch } = useSensors();

    if (error) return <ErrorState title="Sensor Network Error" message={error} />;
    if (loading && sensors.length === 0) {
        return (
            <Box>
                <PageHeader
                    title="Sensor Intelligence"
                    subtitle="Live matrix monitoring of environmental and behavioral IoT telemetry"
                />
                <LoadingCard title="Loading sensors" lines={4} />
            </Box>
        );
    }

    return (
        <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
            <PageHeader
                title="Sensor Intelligence"
                subtitle="Live matrix monitoring of environmental and behavioral IoT telemetry"
                actions={[
                    { label: 'Refresh Network', variant: 'outlined', startIcon: <RefreshCw size={18} />, onClick: refetch }
                ]}
            />
            
            <Grid container spacing={3} mt={1}>
                {sensors.map(s => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={s.device_id || s.device_name}>
                        <SensorCard sensor={s} />
                    </Grid>
                ))}
                
                {sensors.length === 0 && !loading && (
                    <Grid item xs={12}>
                         <EmptyState
                             icon={<AlertTriangle size={32} />}
                             title="No Active Sensors"
                             description="No provisioned sensor hardware was detected in the current barn context."
                         />
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};
