import React from 'react';
import { Box, Button, Grid, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { FileText, Activity } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';

export const ReportsLandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Reports"
        subtitle="Generate exports and monitor report jobs across your operations"
        primaryAction={{
          label: 'View Jobs',
          onClick: () => navigate('/reports/jobs'),
          variant: 'contained',
        }}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <PremiumCard>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <FileText size={26} />
              <Typography variant="h5" fontWeight={700}>
                Feed Intake Export
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Export feed intake records for a selected date range and context.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/reports/jobs/new')}>
              Create Export
            </Button>
          </PremiumCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <PremiumCard>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Activity size={26} />
              <Typography variant="h5" fontWeight={700}>
                Telemetry Export
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Coming soon: export telemetry metrics for analytics and compliance.
            </Typography>
            <Button variant="outlined" disabled>
              Coming Soon
            </Button>
          </PremiumCard>
        </Grid>
      </Grid>
    </Box>
  );
};
