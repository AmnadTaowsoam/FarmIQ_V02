import React from 'react';
import { Box } from '@mui/material';
import { Cpu } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/EmptyState';
import { useNavigate } from 'react-router-dom';

export const SensorsLandingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box data-testid="page-sensors">
      <PageHeader
        title="Sensors"
        subtitle="Monitor sensor networks and environmental telemetry"
      />
      <EmptyState
        icon={<Cpu size={32} />}
        title="Select a sensor view"
        description="Jump into the live matrix or explore trends over time."
        actionLabel="Open Sensor Matrix"
        onAction={() => navigate('/sensors/matrix')}
      />
    </Box>
  );
};
