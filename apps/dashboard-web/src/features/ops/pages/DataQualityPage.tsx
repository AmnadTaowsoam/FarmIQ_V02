import React, { useEffect, useState } from 'react';
import { Box, Grid } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { SectionCard } from '../../../components/ui/SectionCard';
import { StatCard } from '../../../components/ui/StatCard';
import { BasicTable, Column } from '../../../components/tables/BasicTable';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { EmptyState } from '../../../components/EmptyState';
import { api } from '../../../api';
import { unwrapApiResponse } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import type { components } from '@farmiq/api-client';

type OpsDataQuality = components['schemas']['OpsDataQualityResponse']['data'];
type MissingPeriod = components['schemas']['MissingPeriod'];
type DeviceUptime = components['schemas']['DeviceUptime'];

export const DataQualityPage: React.FC = () => {
  const { tenantId, farmId, barnId, timeRange } = useActiveContext();
  const [data, setData] = useState<OpsDataQuality | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!tenantId) return;
      setLoading(true);
      try {
        const response = await api.opsDataQuality({
          tenant_id: tenantId,
          farm_id: farmId || undefined,
          barn_id: barnId || undefined,
          start_time: timeRange.start.toISOString(),
          end_time: timeRange.end.toISOString(),
        });
        const payload = unwrapApiResponse<any>(response) as OpsDataQuality | null;
        setData(payload || null);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId, farmId, barnId, timeRange.start, timeRange.end]);

  if (error) return <ErrorState title="Failed to load data quality" message={error.message} />;
  if (loading && !data) {
    return (
      <Box>
        <PageHeader title="Data Quality & Coverage" subtitle="Track telemetry freshness and missing data" />
        <LoadingCard title="Loading data quality" lines={4} />
      </Box>
    );
  }
  if (!loading && !data) {
    return (
      <Box>
        <PageHeader title="Data Quality & Coverage" subtitle="Track telemetry freshness and missing data" />
        <EmptyState title="No data quality metrics yet" description="Telemetry coverage will appear once data is ingested." />
      </Box>
    );
  }

  const missingColumns: Column<MissingPeriod>[] = [
    { id: 'start', label: 'Start', format: (val) => val ? new Date(val).toLocaleString() : '—' },
    { id: 'end', label: 'End', format: (val) => val ? new Date(val).toLocaleString() : '—' },
    { id: 'duration_minutes', label: 'Duration (min)', align: 'right' },
  ];

  const uptimeColumns: Column<DeviceUptime>[] = [
    { id: 'device_id', label: 'Device ID' },
    { id: 'device_name', label: 'Name' },
    { id: 'uptime_percent_24h', label: 'Uptime 24h', align: 'right' },
    { id: 'uptime_percent_7d', label: 'Uptime 7d', align: 'right' },
    { id: 'uptime_percent_30d', label: 'Uptime 30d', align: 'right' },
    { id: 'last_seen', label: 'Last Seen', format: (val) => val ? new Date(val).toLocaleString() : '—' },
  ];

  return (
    <Box>
      <PageHeader title="Data Quality & Coverage" subtitle="Track telemetry freshness and missing data" />
      <Grid container spacing={3} mt={1}>
        <Grid item xs={12} md={4}>
          <StatCard title="Coverage" value={data?.coverage_percent !== undefined ? `${data.coverage_percent}%` : '—'} />
        </Grid>
        <Grid item xs={12}>
          <SectionCard title="Missing Data Periods">
            <BasicTable<MissingPeriod>
              columns={missingColumns}
              data={data?.missing_data_periods || []}
              loading={loading}
              emptyMessage="No missing data periods."
            />
          </SectionCard>
        </Grid>
        <Grid item xs={12}>
          <SectionCard title="Device Uptime">
            <BasicTable<DeviceUptime>
              columns={uptimeColumns}
              data={data?.device_uptime || []}
              loading={loading}
              emptyMessage="No uptime data."
            />
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};
