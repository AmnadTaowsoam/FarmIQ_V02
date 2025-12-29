import React from 'react';
import { Box } from '@mui/material';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/EmptyState';
import { useNavigate } from 'react-router-dom';

export const OpsLandingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box data-testid="page-ops">
      <PageHeader title="Ops" subtitle="Reliability, data quality, and system health" />
      <EmptyState
        icon={<ShieldCheck size={32} />}
        title="Review ops health"
        description="Check data quality and synchronization health across sites."
        actionLabel="View Ops Health"
        onAction={() => navigate('/ops/health')}
      />
    </Box>
  );
};
