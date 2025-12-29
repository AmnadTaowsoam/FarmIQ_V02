import React from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, Chip } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { useTranslation } from 'react-i18next';
import { Brain, GitBranch, Calendar, Activity } from 'lucide-react';

export const ModelRegistryPage: React.FC = () => {
  const { t } = useTranslation('common');

  // Mock data for when models are available
  const mockModels = [
    {
      name: 'FCR Prediction Model',
      version: 'v2.1',
      status: 'active',
      accuracy: '94.2%',
      lastUpdated: '2 days ago'
    },
    {
      name: 'Growth Rate Forecaster',
      version: 'v1.5',
      status: 'active',
      accuracy: '91.8%',
      lastUpdated: '1 week ago'
    },
    {
      name: 'Anomaly Detector',
      version: 'v3.0',
      status: 'training',
      accuracy: 'N/A',
      lastUpdated: '3 hours ago'
    }
  ];

  const hasModels = false; // Set to true when backend is connected

  return (
    <Box>
      <PageHeader 
        title="Model Registry" 
        subtitle="Manage AI models and versions"
      />

      {!hasModels ? (
        <PremiumCard>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                opacity: 0.1
              }}
            >
              <Brain size={40} />
            </Box>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              No models registered yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Models will appear here once you connect your ML pipeline. Track versions, monitor performance, and manage deployments all in one place.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" disabled>
                Connect ML Pipeline
              </Button>
              <Button variant="outlined" disabled>
                Learn More
              </Button>
            </Box>
          </Box>
        </PremiumCard>
      ) : (
        <Grid container spacing={3}>
          {mockModels.map((model, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Brain size={20} />
                      <Typography variant="h6" fontWeight="bold">
                        {model.name}
                      </Typography>
                    </Box>
                    <Chip 
                      label={model.status} 
                      size="small" 
                      color={model.status === 'active' ? 'success' : 'warning'}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GitBranch size={16} />
                      <Typography variant="body2" color="text.secondary">
                        Version: {model.version}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Activity size={16} />
                      <Typography variant="body2" color="text.secondary">
                        Accuracy: {model.accuracy}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Calendar size={16} />
                      <Typography variant="body2" color="text.secondary">
                        Updated: {model.lastUpdated}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
