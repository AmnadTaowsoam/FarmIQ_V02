import React from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';

export const PdpaPage: React.FC = () => {
  return (
    <Box>
      <PageHeader title="PDPA Notice" subtitle="Personal Data Protection Act (Thailand)" />

      <PremiumCard>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Purpose of Collection
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We collect and process personal data to provide the FarmIQ platform, maintain security,
              support operations, and comply with legal obligations.
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Data Categories
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Basic identity, contact information, account activity, device and usage data, and audit logs.
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Data Retention
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Data is retained for as long as necessary to deliver services and meet regulatory requirements.
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Your Rights
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You have the right to access, correct, delete, or object to the processing of your personal data,
              subject to applicable law.
            </Typography>
          </Box>
        </Stack>
      </PremiumCard>
    </Box>
  );
};
