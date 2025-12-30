import React, { useEffect, useState } from 'react';
import { Box, Grid, Typography, alpha, useTheme } from '@mui/material';
import { Target, Scale, Zap } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { TimeSeriesChart } from '../../../components/charts/TimeSeriesChart';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { TimeRangeSelector } from '../../../components/forms/TimeRangeSelector';
import { api, unwrapApiResponse } from '../../../api';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { EmptyState } from '../../../components/EmptyState';
import type { components } from '@farmiq/api-client';

type AnalyticsResponse = components['schemas']['WeighvisionAnalyticsResponse'];

function formatNumber(value: unknown, fractionDigits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toFixed(fractionDigits);
}

export const AnalyticsPage: React.FC = () => {
  const theme = useTheme();
  const { tenantId, farmId, barnId, timeRange } = useActiveContext();
  const [data, setData] = useState<AnalyticsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
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
        console.error('Analytics fetch error:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [tenantId, farmId, barnId, timeRange.start, timeRange.end]);

  if (error) return <ErrorState title="Failed to load analytics" message={error.message} />;
  if (loading) {
    return (
      <Box>
        <PageHeader title="Weight Analytics" subtitle="Visualizing growth trajectories and flock uniformity trends" action={<TimeRangeSelector />} />
        <LoadingCard title="Loading analytics" lines={4} />
      </Box>
    );
  }
  if (!data) {
    return (
      <Box>
        <PageHeader title="Weight Analytics" subtitle="Visualizing growth trajectories and flock uniformity trends" action={<TimeRangeSelector />} />
        <EmptyState title="No analytics yet" description="Run a WeighVision session to generate analytics insights." />
      </Box>
    );
  }

  const stats = (data?.statistics || {}) as Record<string, number>;

  const statItems = [
    { label: 'Avg Weight', value: `${formatNumber(stats.current_avg_weight_kg)} kg`, icon: <Scale size={24} />, color: 'primary.main', trend: '+2.1%' },
    { label: 'Uniformity', value: `${formatNumber(stats.uniformity_percent)}%`, icon: <Target size={24} />, color: 'success.main', trend: '+0.4%' },
    { label: 'Variation (CV)', value: `${formatNumber(stats.cv)}`, icon: <Zap size={24} />, color: 'info.main', trend: '-0.1%' },
  ];

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader 
        title="Weight Analytics" 
        subtitle="Visualizing growth trajectories and flock uniformity trends"
        action={<TimeRangeSelector />} 
      />
      
      <Grid container spacing={3} mt={1}>
        {statItems.map((stat, idx) => (
            <Grid item xs={12} md={4} key={idx}>
                <PremiumCard sx={{ bgcolor: alpha(theme.palette.background.paper, 0.4), backdropFilter: 'blur(10px)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ 
                                p: 1.5, 
                                bgcolor: alpha(stat.color.startsWith('primary') ? theme.palette.primary.main : stat.color.startsWith('success') ? theme.palette.success.main : theme.palette.info.main, 0.1), 
                                color: stat.color, 
                                borderRadius: 2 
                            }}>
                                {stat.icon}
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</Typography>
                                <Typography variant="h5" fontWeight="800">{stat.value}</Typography>
                            </Box>
                        </Box>
                        <Box sx={{ p: 0.5, px: 1, borderRadius: 1.5, bgcolor: alpha(stat.trend.startsWith('+') ? theme.palette.success.main : theme.palette.error.main, 0.1) }}>
                            <Typography variant="caption" fontWeight="700" color={stat.trend.startsWith('+') ? 'success.main' : 'error.main'}>
                                {stat.trend}
                            </Typography>
                        </Box>
                    </Box>
                </PremiumCard>
            </Grid>
        ))}

        <Grid item xs={12}>
          <PremiumCard title="Weight Growth Trajectory">
            <TimeSeriesChart
              data={(data?.weight_trend || []).map((p: any) => ({
                timestamp: p.date || '',
                weight: p.avg_weight_kg || 0,
              }))}
              lines={[{ key: 'weight', label: 'Average Weight (kg)', color: theme.palette.primary.main }]}
              loading={loading}
              height={400}
            />
          </PremiumCard>
        </Grid>
      </Grid>
    </Box>
  );
};
