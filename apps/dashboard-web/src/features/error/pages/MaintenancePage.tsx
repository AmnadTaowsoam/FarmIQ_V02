import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Wrench } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';

export const MaintenancePage: React.FC = () => {
  return (
    <Box>
      <PageHeader title="Maintenance Mode" subtitle="We are performing scheduled maintenance" />
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 6 }}>
        <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'action.hover', mb: 2 }}>
          <Wrench size={40} />
        </Box>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          We'll be back soon
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, textAlign: 'center', mb: 3 }}>
          FarmIQ is undergoing maintenance. Please check back later or contact support if you need immediate assistance.
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    </Box>
  );
};
