import React from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';

export const TermsPage: React.FC = () => {
  return (
    <Box>
      <PageHeader title="Terms of Service" subtitle="Usage terms and conditions" />

      <PremiumCard>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Acceptance
            </Typography>
            <Typography variant="body2" color="text.secondary">
              By using FarmIQ, you agree to these terms and to comply with applicable laws and regulations.
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Account Responsibilities
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You are responsible for maintaining account security and ensuring authorized use of the platform.
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Service Availability
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We strive for continuous availability, but scheduled maintenance and unforeseen outages may occur.
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Limitation of Liability
            </Typography>
            <Typography variant="body2" color="text.secondary">
              FarmIQ is provided "as is". We are not liable for indirect or consequential damages to the extent permitted by law.
            </Typography>
          </Box>
        </Stack>
      </PremiumCard>
    </Box>
  );
};
