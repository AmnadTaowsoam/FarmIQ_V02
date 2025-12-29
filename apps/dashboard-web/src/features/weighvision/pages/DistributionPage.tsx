import React, { useEffect, useState } from 'react';
import { Box, Grid } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { DistributionChart } from '../../../components/charts/DistributionChart';
import { TimeRangeSelector } from '../../../components/forms/TimeRangeSelector';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { EmptyState } from '../../../components/EmptyState';
import { api, unwrapApiResponse } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import type { components } from '@farmiq/api-client';

type AnalyticsResponse = components['schemas']['WeighvisionAnalyticsResponse'];

export const DistributionPage: React.FC = () => {
  const { tenantId, farmId, barnId, timeRange } = useActiveContext();
  const [data, setData] = useState<AnalyticsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDistribution = async () => {
      if (!tenantId) return;
      setLoading(true);
      try {
        const startDate = timeRange.start.toISOString().split('T')[0];
        const endDate = timeRange.end.toISOString().split('T')[0];
        
        const response = await api.weighvisionAnalytics({
          tenantId: tenantId,
          farm_id: farmId || undefined,
          barn_id: barnId || undefined,
          start_date: startDate,
          end_date: endDate,
        });
        
        // Handle response format: { data: {...} } or direct data
        const responseData = unwrapApiResponse<AnalyticsResponse['data']>(response);
        setData(responseData || null);
        setError(null);
      } catch (err: any) {
        console.error('Distribution fetch error:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchDistribution();
  }, [tenantId, farmId, barnId, timeRange.start, timeRange.end]);

  if (error) return <ErrorState title="Failed to load distribution" message={error.message} />;
  if (loading) {
    return (
      <Box>
        <PageHeader title="Weight Distribution" subtitle="Histogram of bird sizing and statistical spread across the flock" action={<TimeRangeSelector />} />
        <LoadingCard title="Loading distribution" lines={4} />
      </Box>
    );
  }

  const distribution = data?.distribution as { bins?: Array<{ range?: string; count?: number }> } | undefined;
  const bins = distribution?.bins || [];
  if (!bins.length) {
    return (
      <Box>
        <PageHeader title="Weight Distribution" subtitle="Histogram of bird sizing and statistical spread across the flock" action={<TimeRangeSelector />} />
        <EmptyState title="No distribution data yet" description="Run a WeighVision session to populate distribution insights." />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader 
        title="Weight Distribution" 
        subtitle="Histogram of bird sizing and statistical spread across the flock"
        action={<TimeRangeSelector />} 
      />
      <Grid container spacing={3} mt={1}>
        <Grid item xs={12}>
          <PremiumCard title="Flock Size Distribution">
            <DistributionChart
              data={bins.map((b) => ({ range: b.range || '—', count: b.count || 0 }))}
              loading={loading}
              height={450}
            />
          </PremiumCard>
        </Grid>
      </Grid>
    </Box>
  );
};
