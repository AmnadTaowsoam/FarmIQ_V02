import React from 'react';
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export const WorkspaceSettingsPage: React.FC = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage organization-wide settings, defaults, and configurations.
      </Typography>

      <Grid container spacing={3}>
        {/* Organization */}
        <Grid item xs={12} md={6}>
          <PremiumCard title="Organization">
            <TextField 
              label="Organization Name" 
              fullWidth 
              margin="normal" 
              defaultValue="FarmIQ" 
            />
            <TextField 
              label="Default Tenant" 
              fullWidth 
              margin="normal" 
              defaultValue={user?.tenantId || ''} 
              disabled
            />
            <Button variant="contained" sx={{ mt: 2 }}>
              {t('actions.save')}
            </Button>
          </PremiumCard>
        </Grid>

        {/* Defaults */}
        <Grid item xs={12} md={6}>
          <PremiumCard title="Defaults">
            <TextField 
              label="Default Farm" 
              fullWidth 
              margin="normal" 
              placeholder="Select default farm..."
            />
            <TextField 
              label="Default Barn" 
              fullWidth 
              margin="normal" 
              placeholder="Select default barn..."
            />
            <Button variant="contained" sx={{ mt: 2 }}>
              {t('actions.save')}
            </Button>
          </PremiumCard>
        </Grid>

        {/* Integrations */}
        <Grid item xs={12} md={6}>
          <PremiumCard title="Integrations">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure external integrations and API access.
            </Typography>
            <Button variant="outlined">
              Manage API Keys
            </Button>
          </PremiumCard>
        </Grid>

        {/* Data & Privacy */}
        <Grid item xs={12} md={6}>
          <PremiumCard title="Data & Privacy">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Control data retention and privacy settings.
            </Typography>
            <Button variant="outlined">
              View Privacy Policy
            </Button>
          </PremiumCard>
        </Grid>
      </Grid>
    </Box>
  );
};
