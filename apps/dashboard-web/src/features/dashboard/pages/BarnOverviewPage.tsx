import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { StatCard } from '../../../components/ui/StatCard';
import { SectionCard } from '../../../components/ui/SectionCard';
import { BasicTable, Column } from '../../../components/tables/BasicTable';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { EmptyState } from '../../../components/EmptyState';
import { api, unwrapApiResponse } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import type { components } from '@farmiq/api-client';

type BarnDetail = components['schemas']['BarnDetailResponse']['data'];
type DeviceSummary = components['schemas']['DeviceSummary'];
type TelemetrySensor = components['schemas']['TelemetrySensor'];

export const BarnOverviewPage: React.FC = () => {
  const { barnId } = useParams<{ barnId: string }>();
  const navigate = useNavigate();
  const { tenantId } = useActiveContext();
  const [barn, setBarn] = useState<BarnDetail | null>(null);
  const [sensors, setSensors] = useState<TelemetrySensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchBarn = async () => {
      if (!tenantId || !barnId) {
        setLoading(false);
        return;
      }
        setLoading(true);
      try {
        const [barnResponse, sensorsResponse] = await Promise.all([
          api.barns.get(barnId, { tenantId }),
          api.telemetryLatest({ tenant_id: tenantId, barn_id: barnId }),
        ]);
        setBarn(unwrapApiResponse<BarnDetail | null>(barnResponse) || null);
        setSensors(sensorsResponse.data?.sensors || []);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchBarn();
  }, [tenantId, barnId]);

  const latestMetrics = useMemo(() => {
    const flattened = sensors.flatMap((sensor) => sensor.metrics || []);
    const metricMap: Record<string, number> = {};
    flattened.forEach((m) => {
      if (m.metric_type && m.value !== undefined) {
        metricMap[m.metric_type] = m.value;
      }
    });
    return metricMap;
  }, [sensors]);

  if (loading) {
    return (
      <Box>
        <PageHeader title="Barn Overview" subtitle="Ops cockpit for live barn conditions" />
        <LoadingCard title="Loading barn overview" lines={4} />
      </Box>
    );
  }
  if (error) return <ErrorState title="Failed to load barn overview" message={error.message} />;
  if (!barn) {
    return (
      <Box>
        <PageHeader title="Barn Overview" subtitle="Ops cockpit for live barn conditions" />
        <EmptyState title="Barn not found" description="No barn data available for this ID." />
      </Box>
    );
  }

  const deviceColumns: Column<DeviceSummary>[] = [
    { id: 'device_id', label: 'Device ID' },
    { id: 'name', label: 'Name' },
    { id: 'type', label: 'Type' },
    { id: 'status', label: 'Status' },
    {
      id: 'last_seen',
      label: 'Last Seen',
      format: (value) => value ? new Date(value).toLocaleString() : '—',
    },
  ];

  return (
    <Box>
      <PageHeader
        title={barn.name || `Barn ${barnId}`}
        subtitle="Ops cockpit for live barn conditions"
        actions={[{ label: 'Back to Barns', onClick: () => navigate('/barns') }]}
      />

      <Grid container spacing={3} mt={1}>
        <Grid item xs={12} md={4}>
          <StatCard title="Temperature" value={latestMetrics.temperature ? `${latestMetrics.temperature}°C` : '—'} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard title="Humidity" value={latestMetrics.humidity ? `${latestMetrics.humidity}%` : '—'} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard title="Active Devices" value={barn.device_count || 0} />
        </Grid>

        <Grid item xs={12}>
          <SectionCard title="Devices in Barn">
            <BasicTable<DeviceSummary>
              columns={deviceColumns}
              data={barn.devices || []}
              emptyMessage="No devices registered in this barn."
              rowKey="device_id"
            />
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};
