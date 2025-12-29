import React from 'react';
import { Box } from '@mui/material';
import { UtensilsCrossed } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/EmptyState';
import { useNavigate } from 'react-router-dom';

export const FeedingFcrPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box data-testid="page-feeding-fcr">
      <PageHeader
        title="Feeding & FCR"
        subtitle="Track feed intake, efficiency, and growth forecasts"
      />
      <EmptyState
        icon={<UtensilsCrossed size={32} />}
        title="Start with daily feeding"
        description="Review intake trends or move to FCR forecasts."
        actionLabel="Open Daily Feed"
        onAction={() => navigate('/feeding-fcr/daily')}
      />
    </Box>
  );
};
