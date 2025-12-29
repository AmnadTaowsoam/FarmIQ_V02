import React from 'react';
import { Box, Card, CardContent, CardActions, Button, Typography, Grid } from '@mui/material';
import { LineChart, Bell, Activity, BookOpen } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';

const modules = [
  {
    title: 'Metrics Explorer',
    description: 'Query and visualize real-time sensor data, environmental metrics, and device telemetry across your farm.',
    icon: <LineChart size={32} />,
    path: '/telemetry/explorer',
    color: 'primary',
  },
  {
    title: 'Alerts & Notifications',
    description: 'View and manage system alerts, threshold violations, and automated notifications for critical events.',
    icon: <Bell size={32} />,
    path: '/alerts',
    color: 'warning',
  },
  {
    title: 'System Health',
    description: 'Monitor device connectivity, sensor status, and overall system health across edge and cloud infrastructure.',
    icon: <Activity size={32} />,
    path: '/ops/health',
    color: 'success',
  },
];

export const TelemetryLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Telemetry & Monitoring"
        subtitle="Real-time sensor data, metrics visualization, and system health monitoring"
      />

      <Grid container spacing={3}>
        {modules.map((module) => (
          <Grid item xs={12} md={6} lg={4} key={module.path}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: `${module.color}.light`,
                      color: `${module.color}.main`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {module.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    {module.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {module.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                  variant="contained"
                  color={module.color as any}
                  fullWidth
                  onClick={() => navigate(`${module.path}${location.search || ''}`)}
                >
                  Open {module.title}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Additional Info */}
      <Card sx={{ mt: 3, bgcolor: 'background.default' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <BookOpen size={24} />
            <Typography variant="h6" fontWeight={700}>
              About Telemetry & Monitoring
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            The Telemetry & Monitoring module provides comprehensive visibility into your farm's IoT infrastructure. 
            Track environmental conditions (temperature, humidity, ammonia levels), monitor device health, 
            receive real-time alerts for threshold violations, and analyze historical trends to optimize barn conditions and animal welfare.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
