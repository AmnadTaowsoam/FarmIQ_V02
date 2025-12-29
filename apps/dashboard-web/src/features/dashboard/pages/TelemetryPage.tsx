import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, unwrapApiResponse } from '../../../api';
import { Box, Grid, useTheme, Stack, Typography } from '@mui/material';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { TimeSeriesChart } from '../../../components/charts/TimeSeriesChart';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { EmptyState } from '../../../components/EmptyState';
import { Thermometer, Droplets, Cloud, Wind, Download } from 'lucide-react';
import { queryKeys, DEFAULT_STALE_TIME } from '../../../services/queryKeys';
import type { components } from '@farmiq/api-client';

type TelemetryReading = components['schemas']['TelemetryReading'];

export const TelemetryPage: React.FC = () => {
    const theme = useTheme();
    const { tenantId, farmId, barnId, timeRange } = useActiveContext();
    const { data: readings = [], isLoading: loading, error } = useQuery<TelemetryReading[]>({
        queryKey: queryKeys.telemetry.readings({
            farmId: farmId || undefined,
            barnId: barnId || undefined,
            startTime: timeRange.start.toISOString(),
            endTime: timeRange.end.toISOString(),
        }),
        queryFn: async () => {
            if (!tenantId) return [];
            const response = await apiClient.get<{ data: { readings: TelemetryReading[] } }>('/api/v1/telemetry/readings', {
                params: {
                    tenantId,
                    farmId: farmId || undefined,
                    barnId: barnId || undefined,
                    from: timeRange.start.toISOString(),
                    to: timeRange.end.toISOString(),
                    limit: 500,
                },
            });
            const payload = unwrapApiResponse<any>(response);
            if (Array.isArray(payload)) return payload as TelemetryReading[];
            return (payload?.readings as TelemetryReading[] | undefined) || [];
        },
        enabled: !!tenantId,
        staleTime: DEFAULT_STALE_TIME,
        initialData: []
    });

    const stats = useMemo(() => {
        if (!readings.length) return { temp: 0, humidity: 0, co2: 0 };
        const temps = readings.filter(r => r.metric_type === 'temperature').map(r => r.metric_value || 0);
        const hums = readings.filter(r => r.metric_type === 'humidity').map(r => r.metric_value || 0);
        const co2s = readings.filter(r => r.metric_type === 'co2').map(r => r.metric_value || 0);
        
        const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
        return {
            temp: avg(temps),
            humidity: avg(hums),
            co2: avg(co2s)
        };
    }, [readings]);

    const chartData = useMemo(() => {
        return readings.map((r) => ({
            timestamp: r.timestamp || '',
            temperature: r.metric_type === 'temperature' ? (r.metric_value ?? 0) : 0,
            humidity: r.metric_type === 'humidity' ? (r.metric_value ?? 0) : 0,
            co2: r.metric_type === 'co2' ? (r.metric_value ?? 0) : 0,
        }));
    }, [readings]);

    if (error) {
        const isServerError = (error as any)?.response?.status >= 500;
        return (
            <Box>
                <PageHeader 
                    title="Telemetry Explorer" 
                    subtitle="Deep-dive into historical sensor metrics and environmental trends across your facilities" 
                />
                <ErrorState 
                    title={isServerError ? "Backend Unavailable" : "Failed to load telemetry"} 
                    message={isServerError ? "The telemetry service is temporarily unavailable. Please try again." : error.message}
                    onRetry={() => window.location.reload()}
                />
            </Box>
        );
    }
    
    if (loading && readings.length === 0) {
        return (
            <Box>
                <PageHeader 
                    title="Telemetry Explorer" 
                    subtitle="Deep-dive into historical sensor metrics and environmental trends across your facilities" 
                />
                <LoadingCard title="Loading telemetry data..." lines={4} />
            </Box>
        );
    }

    return (
        <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
            <PageHeader 
                title="Telemetry Explorer" 
                subtitle="Deep-dive into historical sensor metrics and environmental trends across your facilities" 
                primaryAction={{
                    label: 'Export Dataset',
                    onClick: () => {},
                    startIcon: <Download size={18} />,
                    variant: 'outlined'
                }}
            />

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <PremiumCard sx={{ p: 2 }}>
                        <Stack spacing={1}>
                            <Typography variant="caption" fontWeight="800" color="text.secondary">AVG TEMPERATURE</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Thermometer size={20} color={theme.palette.error.main} />
                                <Typography variant="h5" fontWeight="800">{stats.temp}°C</Typography>
                            </Box>
                        </Stack>
                    </PremiumCard>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <PremiumCard sx={{ p: 2 }}>
                        <Stack spacing={1}>
                            <Typography variant="caption" fontWeight="800" color="text.secondary">AVG HUMIDITY</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Droplets size={20} color={theme.palette.primary.main} />
                                <Typography variant="h5" fontWeight="800">{stats.humidity}%</Typography>
                            </Box>
                        </Stack>
                    </PremiumCard>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <PremiumCard sx={{ p: 2 }}>
                        <Stack spacing={1}>
                            <Typography variant="caption" fontWeight="800" color="text.secondary">CO2 LEVEL</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Cloud size={20} color={theme.palette.success.main} />
                                <Typography variant="h5" fontWeight="800">{stats.co2} ppm</Typography>
                            </Box>
                        </Stack>
                    </PremiumCard>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <PremiumCard sx={{ p: 2 }}>
                        <Stack spacing={1}>
                            <Typography variant="caption" fontWeight="800" color="text.secondary">AIR QUALITY</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Wind size={20} color={theme.palette.info.main} />
                                <Typography variant="h5" fontWeight="800">Optimal</Typography>
                            </Box>
                        </Stack>
                    </PremiumCard>
                </Grid>
            </Grid>
            
            {readings.length === 0 && !loading ? (
                <EmptyState 
                    title="No telemetry data yet" 
                    description="Select a barn or device to begin collecting telemetry." 
                />
            ) : (
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <PremiumCard title="Temperature History">
                            <TimeSeriesChart
                                data={chartData}
                                lines={[{ key: 'temperature', label: 'Temperature (°C)', color: theme.palette.error.main }]}
                                loading={loading}
                                height={360}
                            />
                        </PremiumCard>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <PremiumCard title="Humidity Trends">
                            <TimeSeriesChart
                                data={chartData}
                                lines={[{ key: 'humidity', label: 'Humidity (%)', color: theme.palette.primary.main }]}
                                loading={loading}
                                height={280}
                            />
                        </PremiumCard>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <PremiumCard title="Environmental CO2">
                            <TimeSeriesChart
                                data={chartData}
                                lines={[{ key: 'co2', label: 'CO2 Levels', color: theme.palette.success.main }]}
                                loading={loading}
                                height={280}
                            />
                        </PremiumCard>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};
