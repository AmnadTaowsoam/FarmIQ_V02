import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Grid, useTheme, Stack, Typography, alpha } from '@mui/material';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { TimeSeriesChart } from '../../../components/charts/TimeSeriesChart';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { EmptyState } from '../../../components/EmptyState';
import { Thermometer, Droplets, Cloud, Wind, Download } from 'lucide-react';
import { queryKeys } from '../../../services/queryKeys';

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
            const statuses = ['pending', 'claimed', 'sending', 'sent', 'acked'];
            const syncOutboxBaseUrl =
                import.meta.env.VITE_SYNC_OUTBOX_BASE_URL ||
                `${window.location.protocol}//${window.location.hostname}:5108`;
            const requests = statuses.map(async (status) => {
                const params = new URLSearchParams();
                params.set('status', status);
                params.set('limit', '1000');
                params.set('tenantId', tenantId);
                if (farmId) params.set('farmId', farmId);
                if (barnId) params.set('barnId', barnId);
                params.set('eventType', 'telemetry.ingested');
                params.set('from', timeRange.start.toISOString());
                params.set('to', timeRange.end.toISOString());

                const response = await fetch(`${syncOutboxBaseUrl}/api/v1/sync/outbox?${params.toString()}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch sync outbox (${response.status})`);
                }
                const payload = await response.json();
                return Array.isArray(payload?.entries) ? payload.entries : [];
            });

            const rows = (await Promise.all(requests)).flat();

            const dedupedById = new Map<string, any>();
            for (const row of rows) {
                if (row?.id) dedupedById.set(String(row.id), row);
            }
            return Array.from(dedupedById.values());
        },
        enabled: !!tenantId,
        staleTime: 15 * 1000,
        refetchInterval: timeRange.preset === 'custom' ? false : 30 * 1000,
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: true,
        placeholderData: []
    });

    const normalizedReadings = useMemo(() => {
        return (rawReadings || []).map((row: any) => {
            const payload = row.payload_json || row.payload || {};
            const rawMetricType =
                payload.metric_type ||
                payload.metric ||
                row.metric_type ||
                row.metric ||
                row.metricType ||
                '';
            const normalizedMetricType = String(rawMetricType).trim().toLowerCase();
            const metricType =
                normalizedMetricType === 'co2_equivalent' ||
                normalizedMetricType === 'co2-equivalent' ||
                normalizedMetricType === 'co2eq'
                    ? 'co2'
                    : normalizedMetricType;
            const metricValue =
                payload.metric_value ??
                payload.value ??
                row.metric_value ??
                row.avgValue ??
                row.avg_value ??
                row.value ??
                row.metricValue ??
                0;
            const timestamp =
                payload.occurred_at ||
                row.occurred_at ||
                row.timestamp ||
                row.bucketStart ||
                row.bucket_start ||
                row.occurredAt ||
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

    const getBucketStart = (timestamp: string, bucket: '5m' | '1h' | '1d') => {
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return null;

        const bucketDate = new Date(date);
        bucketDate.setUTCSeconds(0, 0);

        if (bucket === '5m') {
            bucketDate.setUTCMinutes(Math.floor(bucketDate.getUTCMinutes() / 5) * 5);
            return bucketDate.toISOString();
        }

        if (bucket === '1h') {
            bucketDate.setUTCMinutes(0);
            return bucketDate.toISOString();
        }

        bucketDate.setUTCHours(0, 0, 0, 0);
        return bucketDate.toISOString();
    };

    const chartData = useMemo(() => {
        const byBucket = new Map<
            string,
            {
                timestamp: string;
                temperatureValues: number[];
                humidityValues: number[];
                co2Values: number[];
            }
        >();

        for (const r of normalizedReadings) {
            const ts = String(r.timestamp || '');
            if (!ts) continue;

            const bucketStart = getBucketStart(ts, preferredBucket);
            if (!bucketStart) continue;

            const point = byBucket.get(bucketStart) || {
                timestamp: bucketStart,
                temperatureValues: [],
                humidityValues: [],
                co2Values: [],
            };

            if (r.metric_type === 'temperature' && Number.isFinite(r.metric_value)) point.temperatureValues.push(r.metric_value);
            if (r.metric_type === 'humidity' && Number.isFinite(r.metric_value)) point.humidityValues.push(r.metric_value);
            if (r.metric_type === 'co2' && Number.isFinite(r.metric_value)) point.co2Values.push(r.metric_value);

            byBucket.set(bucketStart, point);
        }

        const average = (values: number[]) =>
            values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

        return Array.from(byBucket.values())
            .map((point) => ({
                timestamp: point.timestamp,
                temperature: average(point.temperatureValues),
                humidity: average(point.humidityValues),
                co2: average(point.co2Values),
            }))
            .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    }, [normalizedReadings, preferredBucket]);

    const heroCardSx = {
        borderRadius: 4,
        background: `linear-gradient(180deg, ${alpha('#FBFCFD', 0.98)} 0%, ${alpha('#F1F5F9', 0.98)} 100%)`,
        border: `1px solid ${alpha(theme.palette.divider, 0.88)}`,
        boxShadow: '0 16px 30px rgba(15, 23, 42, 0.05)',
    };

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
                    <PremiumCard variant="glass" accent="error" sx={heroCardSx}>
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
                    <PremiumCard variant="glass" accent="primary" sx={heroCardSx}>
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
                    <PremiumCard variant="glass" accent="success" sx={heroCardSx}>
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
                    <PremiumCard variant="glass" accent="info" sx={heroCardSx}>
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
                        <PremiumCard
                            title="Temperature History"
                            subtitle="A polished view of environmental temperature shifts across the selected window"
                            variant="glass"
                            glow
                            accent="error"
                            sx={heroCardSx}
                        >
                            <TimeSeriesChart
                                data={chartData}
                                lines={[{ key: 'temperature', label: 'Temperature (°C)', color: theme.palette.error.main }]}
                                loading={loading}
                                height={360}
                                timeZone="UTC"
                                tooltipTimeZone="Asia/Bangkok"
                            />
                        </PremiumCard>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <PremiumCard
                            title="Humidity Trends"
                            subtitle="Continuous moisture levels rendered with cleaner visual depth"
                            variant="glass"
                            glow
                            accent="primary"
                            sx={heroCardSx}
                        >
                            <TimeSeriesChart
                                data={chartData}
                                lines={[{ key: 'humidity', label: 'Humidity (%)', color: theme.palette.primary.main }]}
                                loading={loading}
                                height={280}
                                timeZone="UTC"
                                tooltipTimeZone="Asia/Bangkok"
                            />
                        </PremiumCard>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <PremiumCard
                            title="Environmental CO2"
                            subtitle="CO2 concentration with sharper contrast, refined shading, and premium tooltip treatment"
                            variant="glass"
                            glow
                            accent="success"
                            sx={heroCardSx}
                        >
                            <TimeSeriesChart
                                data={chartData}
                                lines={[{ key: 'co2', label: 'CO2 Levels', color: theme.palette.success.main }]}
                                loading={loading}
                                height={280}
                                timeZone="UTC"
                                tooltipTimeZone="Asia/Bangkok"
                            />
                        </PremiumCard>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};
