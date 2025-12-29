import React from 'react';
import { Box, Grid, Stack, Typography } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';

export const SupportPage: React.FC = () => {
  return (
    <Box>
      <PageHeader title="Support" subtitle="Get help and contact the FarmIQ team" />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <PremiumCard title="Contact">
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                Email: support@farmiq.ai
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Phone: +66 2 000 0000
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hours: Mon-Fri, 09:00-18:00 ICT
              </Typography>
            </Stack>
          </PremiumCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <PremiumCard title="Service Desk">
            <Typography variant="body2" color="text.secondary">
              Submit incidents, request access, or ask for new features. Our support team will respond within
              one business day.
            </Typography>
          </PremiumCard>
        </Grid>
        <Grid item xs={12}>
          <PremiumCard title="FAQ">
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  How do I reset my password?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use the Forgot Password link on the login page to receive a reset link.
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Where do I change my workspace settings?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Navigate to Settings from the profile menu or sidebar.
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  How can I report a data issue?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Contact support with the tenant, farm, and time range affected.
                </Typography>
              </Box>
            </Stack>
          </PremiumCard>
        </Grid>
      </Grid>
    </Box>
  );
};
