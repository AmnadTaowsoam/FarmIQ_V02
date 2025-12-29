import React from 'react';
import { Box, Grid, Typography, useTheme } from '@mui/material';
import { TrendingUp } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { TimeSeriesChart } from '../../../components/charts/TimeSeriesChart';
import { BasicTable } from '../../../components/tables/BasicTable';
import { useFeeding } from '../../../hooks/useFeeding';
import { formatDate } from '../../../utils/format';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { EmptyState } from '../../../components/EmptyState';

export const DailyFeedingPage: React.FC = () => {
    const theme = useTheme();
    const { dailyData, loading, error } = useFeeding();

    const columns: any[] = [
        { id: 'date', label: 'Date', format: (val: string) => <Typography variant="body2" fontWeight="600">{formatDate(val)}</Typography> },
        { id: 'feed_intake_kg', label: 'Actual (kg)', align: 'right', format: (v: number) => <Typography variant="body2" fontWeight="700" color="primary">{v?.toFixed(1)}</Typography> },
        { id: 'planned_feed_kg', label: 'Target (kg)', align: 'right', format: (v: number) => <Typography variant="body2" sx={{ opacity: 0.7 }}>{v?.toFixed(1)}</Typography> },
        { 
            id: 'difference_kg', 
            label: 'Variance', 
            align: 'right', 
            format: (v: number) => (
                <Typography variant="body2" fontWeight="700" color={v > 0 ? 'error.main' : 'success.main'}>
                    {v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
                </Typography>
            )
        },
        { id: 'cumulative_feed_kg', label: 'Total (kg)', align: 'right', format: (v: number) => <strong>{v?.toLocaleString()}</strong> },
    ];

    if (error) return <ErrorState title="Failed to load feeding data" message={error} />;
    if (loading && dailyData.length === 0) {
        return (
            <Box>
                <PageHeader title="Predictive Feed Analytics" subtitle="Analyzing consumption patterns vs metabolic growth targets" />
                <LoadingCard title="Loading feeding data" lines={4} />
            </Box>
        );
    }
    if (!loading && dailyData.length === 0) {
        return (
            <Box>
                <PageHeader title="Predictive Feed Analytics" subtitle="Analyzing consumption patterns vs metabolic growth targets" />
                <EmptyState title="No feeding data yet" description="Feed logs will appear once intake is recorded." />
            </Box>
        );
    }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader 
        title="Predictive Feed Analytics" 
        subtitle="Analyzing consumption patterns vs metabolic growth targets"
        actions={[
            { label: 'Forecast Next 7 Days', variant: 'contained', startIcon: <TrendingUp size={18} />, onClick: () => {} }
        ]} 
      />
      
      <Grid container spacing={3} mt={1}>
        <Grid item xs={12}>
            <PremiumCard title="Intake Efficiency Over Time">
                <TimeSeriesChart 
                    data={dailyData.map(d => ({ timestamp: d.date || '', intake: d.feed_intake_kg || 0, target: d.planned_feed_kg || 0 }))}
                    lines={[
                        { key: 'intake', label: 'Actual Intake', color: theme.palette.primary.main },
                        { key: 'target', label: 'Metabolic Target', color: theme.palette.text.secondary, strokeWidth: 1 }
                    ]}
                    loading={loading}
                    height={380}
                />
            </PremiumCard>
        </Grid>
        
        <Grid item xs={12}>
           <PremiumCard title="Detailed Consumption Log" noPadding>
               <BasicTable
                   columns={columns}
                   data={dailyData}
                   loading={loading}
                   emptyMessage="No feeding log data identified for this context."
                />
           </PremiumCard>
        </Grid>
      </Grid>
    </Box>
  );
};
