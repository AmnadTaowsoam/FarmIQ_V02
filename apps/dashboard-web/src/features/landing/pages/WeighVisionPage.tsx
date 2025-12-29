import React from 'react';
import { Box } from '@mui/material';
import { Camera } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/EmptyState';
import { useNavigate } from 'react-router-dom';

export const WeighVisionPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box data-testid="page-weighvision">
      <PageHeader
        title="WeighVision"
        subtitle="AI-powered weighing and visual inference workflows"
      />
      <EmptyState
        icon={<Camera size={32} />}
        title="Start a WeighVision session"
        description="Create a session to capture images and generate weight estimates."
        actionLabel="View Sessions"
        onAction={() => navigate('/weighvision/sessions')}
      />
    </Box>
  );
};
