import React, { useEffect, useState, useMemo } from 'react';
import { Box, Grid, alpha, useTheme, Typography } from '@mui/material';
import { Thermometer, Droplets, Wind } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { TimeSeriesChart } from '../../../components/charts/TimeSeriesChart';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { EmptyState } from '../../../components/EmptyState';
import { api, unwrapApiResponse } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import type { components } from '@farmiq/api-client';

type TelemetryReading = components['schemas']['TelemetryReading'];

export const SensorTrendsPage: React.FC = () => {
  const theme = useTheme();
  const { tenantId, farmId, barnId, timeRange } = useActiveContext();
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchReadings = async () => {
      if (!tenantId || !barnId) return;
      setLoading(true);
      try {
        const response = await api.telemetry.readings({
          tenantId,
          farmId: farmId || undefined,
          barnId,
          from: timeRange.start.toISOString(),
          to: timeRange.end.toISOString(),
          limit: 500,
        });
        const payload = unwrapApiResponse<any>(response);
        const items = Array.isArray(payload) ? payload : payload?.readings;
        setReadings(Array.isArray(items) ? (items as TelemetryReading[]) : []);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchReadings();
  }, [tenantId, farmId, barnId, timeRange.start, timeRange.end]);

  const chartData = useMemo(() => {
    return readings.map((r: TelemetryReading) => ({
      timestamp: (r as any).occurredAt || (r as any).occurred_at || (r as any).timestamp || '',
      temperature: (r as any).metric === 'temperature' ? Number((r as any).value ?? 0) : undefined,
      humidity: (r as any).metric === 'humidity' ? Number((r as any).value ?? 0) : undefined,
      co2: (r as any).metric === 'co2' ? Number((r as any).value ?? 0) : undefined,
    }));
  }, [readings]);

  if (error) return <ErrorState title="Failed to load sensor trends" message={error.message} />;
  if (loading && readings.length === 0) {
    return (
      <Box>
        <PageHeader title="Sensor Trends & Deep Analytics" subtitle="Cross-referencing multi-factor environmental telemetry to identify correlations" />
        <LoadingCard title="Loading sensor trends" lines={4} />
      </Box>
    );
  }
  if (!loading && readings.length === 0) {
    return (
      <Box>
        <PageHeader title="Sensor Trends & Deep Analytics" subtitle="Cross-referencing multi-factor environmental telemetry to identify correlations" />
        <EmptyState title="No sensor trends yet" description="Capture telemetry readings to populate trend analytics." />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader 
        title="Sensor Trends & Deep Analytics" 
        subtitle="Cross-referencing multi-factor environmental telemetry to identify correlations" 
      />
      
      <Grid container spacing={3} mt={1}>
        <Grid item xs={12} md={8}>
          <PremiumCard title="Environmental Synchronization">
            <TimeSeriesChart
              data={chartData}
              lines={[
                { key: 'temperature', label: 'Temperature (°C)', color: theme.palette.error.main },
                { key: 'humidity', label: 'Humidity (%)', color: theme.palette.info.main },
              ]}
              loading={loading}
              height={400}
            />
          </PremiumCard>
        </Grid>
        
        <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[
                    { label: 'Temp Range', value: '24°C - 28°C', icon: <Thermometer size={20} />, color: 'error.main' },
                    { label: 'Avg Humidity', value: '62%', icon: <Droplets size={20} />, color: 'info.main' },
                    { label: 'CO2 Exposure', value: '840 ppm', icon: <Wind size={20} />, color: 'success.main' },
                ].map((stat, idx) => (
                    <PremiumCard key={idx} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.4), backdropFilter: 'blur(8px)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1, bgcolor: alpha(stat.color.startsWith('error') ? theme.palette.error.main : stat.color.startsWith('info') ? theme.palette.info.main : theme.palette.success.main, 0.1), color: stat.color, borderRadius: 1.5 }}>
                                {stat.icon}
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="600">{stat.label}</Typography>
                                <Typography variant="h6" fontWeight="700">{stat.value}</Typography>
                            </Box>
                        </Box>
                    </PremiumCard>
                ))}
            </Box>
        </Grid>

        <Grid item xs={12}>
          <PremiumCard title="Air Quality Trend (CO2)">
            <TimeSeriesChart
              data={chartData}
              lines={[{ key: 'co2', label: 'CO2 Concentration (ppm)', color: theme.palette.success.main }]}
              loading={loading}
              height={350}
            />
          </PremiumCard>
        </Grid>
      </Grid>
    </Box>
  );
};
