import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { useTranslation } from 'react-i18next';
import { GitBranch } from 'lucide-react';

export const WhatIfSimulatorPage: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <Box>
      <PageHeader 
        title="What-if Simulator" 
        subtitle="Test different scenarios and predict outcomes"
      />

      <PremiumCard>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'info.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              opacity: 0.1
            }}
          >
            <GitBranch size={40} />
          </Box>
          <Typography variant="h5" gutterBottom fontWeight="bold">
            What-if Simulator Coming Soon
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
            Run simulations to test different scenarios and predict outcomes before making changes to your operations.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="outlined" disabled>
              Request Early Access
            </Button>
          </Box>
        </Box>
      </PremiumCard>
    </Box>
  );
};
