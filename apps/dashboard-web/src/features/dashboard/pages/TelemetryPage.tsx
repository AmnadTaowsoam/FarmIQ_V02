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

export const TelemetryPage: React.FC = () => {
    const theme = useTheme();
    const { tenantId, farmId, barnId, timeRange } = useActiveContext();
    const preferredBucket = useMemo(() => {
        const durationMs = timeRange.end.getTime() - timeRange.start.getTime();
        const durationDays = durationMs / (24 * 60 * 60 * 1000);
        if (durationDays <= 2) return '5m';
        if (durationDays <= 30) return '1h';
        return '1d';
    }, [timeRange.end, timeRange.start]);

    const { data: rawReadings = [], isLoading: loading, error } = useQuery<any[]>({
        queryKey: queryKeys.telemetry.aggregates({
            farmId: farmId || undefined,
            barnId: barnId || undefined,
            startTime: timeRange.start.toISOString(),
            endTime: timeRange.end.toISOString(),
            interval: preferredBucket,
        }),
        queryFn: async () => {
            if (!tenantId) return [];

            const candidateBuckets = Array.from(
                new Set<string>([preferredBucket, '5m', '1h', '1d'])
            );

            for (const bucket of candidateBuckets) {
                const response = await apiClient.get<any>('/api/v1/telemetry/aggregates', {
                    params: {
                        tenantId,
                        farmId: farmId || undefined,
                        barnId: barnId || undefined,
                        from: timeRange.start.toISOString(),
                        to: timeRange.end.toISOString(),
                        bucket,
                    },
                });
                const payload = unwrapApiResponse<any>(response);
                const rows = Array.isArray(payload) ? payload : (payload?.aggregates as any[] | undefined) || [];
                if (rows.length > 0) return rows;
            }

            return [];
        },
        enabled: !!tenantId,
        staleTime: DEFAULT_STALE_TIME,
        placeholderData: []
    });

    const normalizedReadings = useMemo(() => {
        return (rawReadings || []).map((row: any) => {
            const metricType = row.metric_type || row.metric || row.metricType || '';
            const metricValue =
                row.metric_value ??
                row.avgValue ??
                row.avg_value ??
                row.value ??
                row.metricValue ??
                0;
            const timestamp =
                row.timestamp ||
                row.bucketStart ||
                row.bucket_start ||
                row.occurredAt ||
                row.occurred_at ||
                row.createdAt ||
                '';

            const parsedValue =
                typeof metricValue === 'number'
                    ? metricValue
                    : typeof metricValue === 'string'
                        ? Number.parseFloat(metricValue)
                        : 0;

            return {
                ...row,
                metric_type: metricType,
                metric_value: Number.isFinite(parsedValue) ? parsedValue : 0,
                timestamp,
            };
        });
    }, [rawReadings]);

    const stats = useMemo(() => {
        if (!normalizedReadings.length) return { temp: 0, humidity: 0, co2: 0 };
        const temps = normalizedReadings.filter(r => r.metric_type === 'temperature').map(r => r.metric_value || 0);
        const hums = normalizedReadings.filter(r => r.metric_type === 'humidity').map(r => r.metric_value || 0);
        const co2s = normalizedReadings.filter(r => r.metric_type === 'co2').map(r => r.metric_value || 0);
        
        const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
        return {
            temp: avg(temps),
            humidity: avg(hums),
            co2: avg(co2s)
        };
    }, [normalizedReadings]);

    const chartData = useMemo(() => {
        const byTs = new Map<string, any>();
        for (const r of normalizedReadings) {
            const ts = String(r.timestamp || '');
            if (!ts) continue;
            const point = byTs.get(ts) || { timestamp: ts, temperature: 0, humidity: 0, co2: 0 };
            if (r.metric_type === 'temperature') point.temperature = r.metric_value ?? 0;
            if (r.metric_type === 'humidity') point.humidity = r.metric_value ?? 0;
            if (r.metric_type === 'co2') point.co2 = r.metric_value ?? 0;
            byTs.set(ts, point);
        }
        return Array.from(byTs.values()).sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    }, [normalizedReadings]);

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
    
    if (loading && rawReadings.length === 0) {
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
            
            {normalizedReadings.length === 0 && !loading ? (
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
