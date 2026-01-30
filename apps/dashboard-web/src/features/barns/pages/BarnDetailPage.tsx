import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, alpha, useTheme } from '@mui/material';
import { ArrowLeft, Thermometer, Droplets, Activity } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { TimeSeriesChart } from '../../../components/charts/TimeSeriesChart';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { useBarnData } from '../../../hooks/useBarnData';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { api } from '../../../api';
import type { components } from '@farmiq/api-client';

type TelemetryReading = components['schemas']['TelemetryReading'];

export const BarnDetailPage: React.FC = () => {
  const theme = useTheme();
  const { barnId } = useParams<{ barnId: string }>();
  const navigate = useNavigate();
  const { data: barn, isLoading: loading, error } = useBarnData(barnId);
  const { tenantId, timeRange } = useActiveContext();
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [readingsLoading, setReadingsLoading] = useState(false);

  useEffect(() => {
    const fetchReadings = async () => {
      if (!tenantId || !barnId) return;
      setReadingsLoading(true);
      try {
        const response = await api.telemetryReadingsList({
          tenantId: tenantId,
          barn_id: barnId,
          start_time: timeRange.start.toISOString(),
          end_time: timeRange.end.toISOString(),
          limit: 200,
        });
        setReadings(response.data?.readings || []);
      } catch (err) {
        console.error('Failed to fetch telemetry readings', err);
        setReadings([]);
      } finally {
        setReadingsLoading(false);
      }
    };

    fetchReadings();
  }, [tenantId, barnId, timeRange.start, timeRange.end]);

  const chartData = useMemo(() => {
    const grouped = new Map<string, { timestamp: string; temperature?: number; humidity?: number }>();

    readings.forEach(r => {
      if (!r.timestamp) return; // Skip readings without timestamp
      const existing = grouped.get(r.timestamp) || { timestamp: r.timestamp };
      if (r.metric_type === 'temperature') existing.temperature = r.metric_value;
      if (r.metric_type === 'humidity') existing.humidity = r.metric_value;
      grouped.set(r.timestamp, existing);
    });

    return Array.from(grouped.values())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [readings]);

  const latestTemperature = readings.find((r) => r.metric_type === 'temperature')?.metric_value;
  const latestHumidity = readings.find((r) => r.metric_type === 'humidity')?.metric_value;

  if (loading) {
    return (
      <Box>
        <PageHeader title="Barn Detail" subtitle="Real-time telemetry and environmental controls" />
        <LoadingCard title="Loading barn details" lines={4} />
      </Box>
    );
  }
  if (error) return <ErrorState message={error.message} />;
  if (!barn) {
    return (
      <Box>
        <PageHeader title="Barn Detail" subtitle="Real-time telemetry and environmental controls" />
        <EmptyState title="Barn not found" description="We could not find this barn in the current tenant." />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title={barn.name || `Barn ${barnId}`}
        subtitle={`Real-time telemetry and environmental controls`}
        actions={[
          {
            label: 'Back',
            onClick: () => navigate('/barns'),
            startIcon: <ArrowLeft size={18} />,
            variant: 'outlined',
          }
        ]}
      />

      <Grid container spacing={3} mt={1}>
        {[
          { label: 'Current Temp', value: `${latestTemperature ?? '—'}°C`, icon: <Thermometer size={24} />, color: 'error.main' },
          { label: 'Humidity', value: `${latestHumidity ?? '—'}%`, icon: <Droplets size={24} />, color: 'primary.main' },
          { label: 'Active Devices', value: barn.device_count ?? 0, icon: <Activity size={24} />, color: 'secondary.main' },
        ].map((stat, idx) => (
          <Grid item xs={12} md={4} key={idx} sx={{ animation: `fadeIn 0.4s ease-out ${idx * 0.1}s both` }}>
            <PremiumCard sx={{ p: 1, bgcolor: alpha(theme.palette.background.paper, 0.4), backdropFilter: 'blur(10px)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ p: 1.5, bgcolor: alpha(stat.color.split('.')[0] === 'error' ? theme.palette.error.main : stat.color.split('.')[0] === 'primary' ? theme.palette.primary.main : theme.palette.secondary.main, 0.1), color: stat.color, borderRadius: 2 }}>
                        {stat.icon}
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</Typography>
                        <Typography variant="h4" fontWeight="800">{stat.value}</Typography>
                    </Box>
                </Box>
            </PremiumCard>
          </Grid>
        ))}

        <Grid item xs={12}>
          <PremiumCard title="Environmental Trends">
            <TimeSeriesChart
              data={chartData}
              lines={[
                { key: 'temperature', label: 'Temperature (°C)', color: theme.palette.error.main },
                { key: 'humidity', label: 'Humidity (%)', color: theme.palette.primary.main },
              ]}
              loading={readingsLoading}
              height={400}
            />
          </PremiumCard>
        </Grid>
      </Grid>
    </Box>
  );
};
