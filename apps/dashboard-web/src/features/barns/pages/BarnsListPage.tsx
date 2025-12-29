import { Box, Typography } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { StatusChip } from '../../../components/common/StatusChip';
import { BasicTable } from '../../../components/tables/BasicTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { useBarns, Barn } from '../../../hooks/useBarns';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';

export const BarnsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: barns, isLoading: loading, error } = useBarns();

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
        <PageHeader title="Barns" subtitle="Across all your registered farm property" />
        <EmptyState title="No barns found" description="Create a barn to start tracking performance." />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader 
        title="Barns" 
        subtitle="Across all your registered farm property"
        actions={[
            { label: 'Create Barn', variant: 'contained', startIcon: <LayoutGrid size={18} />, onClick: () => navigate('/barns/new') }
        ]}
      />
      
      <PremiumCard noPadding>
          <BasicTable<Barn>
            columns={[
              { id: 'name', label: 'Name', format: (val) => <Typography variant="body2" fontWeight="600">{val}</Typography> },
              { id: 'farm_id', label: 'Farm Location' },
              { id: 'device_count', label: 'Devices', align: 'right' },
              { id: 'current_temperature', label: 'Temp (°C)', align: 'right', format: (val) => val ? `${val}°C` : '—' },
              { id: 'current_humidity', label: 'Humidity (%)', align: 'right', format: (val) => val ? `${val}%` : '—' },
              {
                id: 'status',
                label: 'Status',
                format: (value: any) => (
                  <StatusChip status={value === 'active' ? 'success' : 'info'} label={value?.toUpperCase()} />
                ),
              },
            ]}
            data={barns}
            loading={loading}
            rowKey="barn_id"
            onRowClick={(row) => navigate(`/barns/${row.barn_id}`)}
          />
      </PremiumCard>
    </Box>
  );
};
