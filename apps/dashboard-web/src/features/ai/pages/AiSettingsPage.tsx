import React from 'react';
import { Box, Grid, TextField, Switch, FormControlLabel, Button } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { useTranslation } from 'react-i18next';

export const AiSettingsPage: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <Box>
      <PageHeader 
        title="AI Settings" 
        subtitle="Configure AI features and preferences"
      />

      <Grid container spacing={3}>
        {/* Model Preferences */}
        <Grid item xs={12} md={6}>
          <PremiumCard title="Model Preferences">
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Enable automatic model updates"
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Auto-deploy approved models"
            />
            <FormControlLabel
              control={<Switch />}
              label="Enable experimental features"
            />
            <TextField
              label="Model refresh interval (hours)"
              type="number"
              fullWidth
              margin="normal"
              defaultValue={24}
            />
          </PremiumCard>
        </Grid>

        {/* Alert Thresholds */}
        <Grid item xs={12} md={6}>
          <PremiumCard title="Alert Thresholds">
            <TextField
              label="Anomaly confidence threshold (%)"
              type="number"
              fullWidth
              margin="normal"
              defaultValue={85}
              helperText="Minimum confidence to trigger anomaly alert"
            />
            <TextField
              label="Drift detection threshold (%)"
              type="number"
              fullWidth
              margin="normal"
              defaultValue={15}
              helperText="Maximum acceptable model drift"
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Send email alerts for critical anomalies"
            />
          </PremiumCard>
        </Grid>

        {/* Data Retention */}
        <Grid item xs={12} md={6}>
          <PremiumCard title="Data Retention">
            <TextField
              label="Prediction history (days)"
              type="number"
              fullWidth
              margin="normal"
              defaultValue={90}
            />
            <TextField
              label="Model metrics retention (days)"
              type="number"
              fullWidth
              margin="normal"
              defaultValue={365}
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Archive old predictions"
            />
          </PremiumCard>
        </Grid>

        {/* API Configuration */}
        <Grid item xs={12} md={6}>
          <PremiumCard title="API Configuration">
            <TextField
              label="API Endpoint"
              fullWidth
              margin="normal"
              defaultValue="https://api.farmiq.ai/v1"
              disabled
            />
            <TextField
              label="API Key"
              type="password"
              fullWidth
              margin="normal"
              placeholder="••••••••••••••••"
              helperText="Contact admin to update API key"
            />
            <Button variant="outlined" fullWidth sx={{ mt: 2 }} disabled>
              Test Connection
            </Button>
          </PremiumCard>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined">
              Reset to Defaults
            </Button>
            <Button variant="contained">
              Save Settings
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
