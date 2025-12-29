import React from 'react';
import { Box } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/EmptyState';

interface ComingSoonPageProps {
  title: string;
  description?: string;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title, description }) => {
  return (
    <Box>
      <PageHeader title={title} />
      <EmptyState
        title="Coming Soon"
        description={description || 'This page is under development.'}
      />
    </Box>
  );
};

