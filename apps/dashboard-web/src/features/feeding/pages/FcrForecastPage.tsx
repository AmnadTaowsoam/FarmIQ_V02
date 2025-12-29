import React, { useEffect, useState } from 'react';
import { Box, Grid } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { SectionCard } from '../../../components/ui/SectionCard';
import { TimeSeriesChart } from '../../../components/charts/TimeSeriesChart';
import { BasicTable, Column } from '../../../components/tables/BasicTable';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { EmptyState } from '../../../components/EmptyState';
import { api } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import type { components } from '@farmiq/api-client';

type FcrPoint = components['schemas']['FcrPoint'];
type FeedingFcrResponse = components['schemas']['FeedingFcrResponse'];

export const FcrForecastPage: React.FC = () => {
  const { tenantId, farmId, barnId, batchId, timeRange } = useActiveContext();
  const [data, setData] = useState<FeedingFcrResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchFcr = async () => {
      if (!tenantId) return;
      setLoading(true);
      try {
        const startDate = timeRange.start.toISOString().slice(0, 10);
        const endDate = timeRange.end.toISOString().slice(0, 10);
        const response = await api.feedingFcr({
          tenant_id: tenantId,
          farm_id: farmId || undefined,
          barn_id: barnId || undefined,
          batch_id: batchId || undefined,
          start_date: startDate,
          end_date: endDate,
        });
        setData(response.data || null);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchFcr();
  }, [tenantId, farmId, barnId, batchId, timeRange.start, timeRange.end]);

  if (error) return <ErrorState title="Failed to load FCR" message={error.message} />;
  if (loading && !data) {
    return (
      <Box>
        <PageHeader title="FCR & Forecast" subtitle="Feed conversion and growth forecast" />
        <LoadingCard title="Loading FCR data" lines={4} />
      </Box>
    );
  }
  if (!loading && !data) {
    return (
      <Box>
        <PageHeader title="FCR & Forecast" subtitle="Feed conversion and growth forecast" />
        <EmptyState title="No FCR data yet" description="Collect feed and weight data to populate forecasts." />
      </Box>
    );
  }

  const points = data?.fcr_trend || [];
  const columns: Column<FcrPoint>[] = [
    { id: 'date', label: 'Date' },
    { id: 'fcr', label: 'FCR', align: 'right' },
    { id: 'adg_kg_per_day', label: 'ADG (kg/day)', align: 'right' },
    { id: 'feed_intake_kg', label: 'Feed Intake (kg)', align: 'right' },
    { id: 'weight_gain_kg', label: 'Weight Gain (kg)', align: 'right' },
  ];

  return (
    <Box>
      <PageHeader title="FCR & Forecast" subtitle="Feed conversion and growth forecast" />
      <Grid container spacing={3} mt={1}>
        <Grid item xs={12}>
          <SectionCard title="FCR Trend">
            <TimeSeriesChart
              data={points.map((p) => ({ timestamp: p.date || '', fcr: p.fcr || 0 }))}
              lines={[{ key: 'fcr', label: 'FCR' }]}
              loading={loading}
              height={320}
            />
          </SectionCard>
        </Grid>
        <Grid item xs={12}>
          <SectionCard title="FCR Details">
            <BasicTable<FcrPoint>
              columns={columns}
              data={points}
              loading={loading}
              emptyMessage="No FCR data available."
            />
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};
