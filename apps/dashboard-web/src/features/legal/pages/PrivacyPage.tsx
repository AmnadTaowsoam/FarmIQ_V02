import React from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';

export const PrivacyPage: React.FC = () => {
  return (
    <Box>
      <PageHeader title="Privacy Policy" subtitle="How we use and protect your data" />

      <PremiumCard>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Overview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We respect your privacy and are committed to safeguarding the information you share with FarmIQ.
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Data Usage
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Data is used to deliver features, improve insights, and ensure platform reliability and security.
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Sharing
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We do not sell personal data. Data may be shared with trusted service providers under strict agreements.
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Security
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We implement administrative, technical, and physical safeguards to protect your information.
            </Typography>
          </Box>
        </Stack>
      </PremiumCard>
    </Box>
  );
};
