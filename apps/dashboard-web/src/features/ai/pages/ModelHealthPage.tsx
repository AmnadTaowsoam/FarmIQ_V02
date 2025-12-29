import React from 'react';
import { Box, Typography, Button, Grid } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { useTranslation } from 'react-i18next';
import { Activity, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

export const ModelHealthPage: React.FC = () => {
  const { t } = useTranslation('common');

  const hasMetrics = false; // Set to true when backend is connected

  return (
    <Box>
      <PageHeader 
        title="Model Health & Drift" 
        subtitle="Monitor model performance and detect drift"
      />

      {!hasMetrics ? (
        <PremiumCard>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                opacity: 0.1
              }}
            >
              <Activity size={40} />
            </Box>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              No health metrics available
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
              Connect telemetry to track model health and performance metrics
            </Typography>

            <Box sx={{ 
              bgcolor: 'background.default', 
              borderRadius: 2, 
              p: 3, 
              mb: 4,
              maxWidth: 600,
              mx: 'auto',
              textAlign: 'left'
            }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                What you'll be able to monitor:
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle size={18} color="green" />
                    <Typography variant="body2">Model accuracy</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingDown size={18} color="orange" />
                    <Typography variant="body2">Prediction drift</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Activity size={18} color="blue" />
                    <Typography variant="body2">Performance metrics</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AlertTriangle size={18} color="red" />
                    <Typography variant="body2">Anomaly detection</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" disabled>
                Setup Monitoring
              </Button>
              <Button variant="outlined" disabled>
                View Documentation
              </Button>
            </Box>
          </Box>
        </PremiumCard>
      ) : (
        <Grid container spacing={3}>
          {/* Placeholder for when metrics are available */}
          <Grid item xs={12}>
            <Typography>Model health metrics will appear here</Typography>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
