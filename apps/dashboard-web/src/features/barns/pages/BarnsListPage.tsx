import { Box, Grid, Typography, Stack, alpha, useTheme, Button } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { StatusChip } from '../../../components/common/StatusChip';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { useBarns, Barn } from '../../../hooks/useBarns';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Warehouse, Thermometer, Droplets } from 'lucide-react';

export const BarnsListPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data: barns, isLoading: loading, error } = useBarns();

  const headerActions = [
    { label: 'Create Barn', variant: 'contained' as const, startIcon: <LayoutGrid size={18} />, onClick: () => navigate('/barns/new') },
  ];

  if (loading) {
    return (
      <Box>
        <PageHeader title="Barns" subtitle="Across all your registered farm property" />
        <LoadingCard title="Loading barns" lines={3} />
      </Box>
    );
  }
  if (error) return <ErrorState message={error.message} />;
  if (barns.length === 0) {
    return (
      <Box>
        <PageHeader title="Barns" subtitle="Across all your registered farm property" actions={headerActions} />
        <EmptyState
          title="No barns found"
          description="Create a barn to start tracking performance."
          actionLabel="Create Barn"
          onAction={() => navigate('/barns/new')}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader 
        title="Barns" 
        subtitle="Across all your registered farm property"
        actions={headerActions}
      />

      <Grid container spacing={3}>
        {barns.map((barn: Barn, index: number) => {
          const statusLabel = (barn.status || 'active').toUpperCase();
          const statusType = barn.status === 'active' ? 'success' : 'info';
          const barnId = barn.barn_id || (barn as any).id;
          const barnKey = barnId || `${barn.name}-${index}`;

          return (
            <Grid item xs={12} sm={6} md={4} key={barnKey} sx={{ animation: `fadeIn 0.4s ease-out ${index * 0.1}s both` }}>
              <PremiumCard
                hoverable
                noPadding
                sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                onClick={() => barnId && navigate(`/barns/${barnId}`)}
              >
                <Box sx={{ p: 3, flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', borderRadius: 2 }}>
                      <LayoutGrid size={28} />
                    </Box>
                    <StatusChip status={statusType} label={statusLabel} />
                  </Box>

                  <Typography variant="h5" fontWeight="700" gutterBottom>
                    {barn.name || barn.barn_id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Barn ID: {barn.barn_id || '—'}
                  </Typography>

                  <Stack spacing={1.25}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                      <Warehouse size={18} />
                      <Typography variant="body2">Farm: {barn.farm_id || '—'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                      <Thermometer size={18} />
                      <Typography variant="body2">
                        Temp: {barn.current_temperature !== null && barn.current_temperature !== undefined ? `${barn.current_temperature}°C` : '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                      <Droplets size={18} />
                      <Typography variant="body2">
                        Humidity: {barn.current_humidity !== null && barn.current_humidity !== undefined ? `${barn.current_humidity}%` : '—'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                  <Button fullWidth variant="text" sx={{ borderRadius: 1.5, color: 'text.secondary', fontWeight: 600 }}>
                    View Details
                  </Button>
                </Box>
              </PremiumCard>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
