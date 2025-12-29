import React from 'react';
import { Box, Card, CardContent, CardActions, Button, Typography, Grid } from '@mui/material';
import { BarChart3, Clipboard, Package, FlaskConical, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';

const modules = [
  {
    title: 'KPI Dashboard',
    description: 'Monitor key feeding performance indicators including FCR, daily intake trends, and efficiency metrics.',
    icon: <BarChart3 size={32} />,
    path: '/feeding/kpi',
    color: 'primary',
  },
  {
    title: 'Daily Intake',
    description: 'Record and track daily feed consumption by barn, batch, and individual animals.',
    icon: <Clipboard size={32} />,
    path: '/feeding/intake',
    color: 'success',
  },
  {
    title: 'Feed Lots & Deliveries',
    description: 'Manage feed inventory, track lot numbers, and record delivery batches.',
    icon: <Package size={32} />,
    path: '/feeding/lots',
    color: 'info',
  },
  {
    title: 'Quality Results',
    description: 'View and analyze feed quality test results, nutritional analysis, and compliance reports.',
    icon: <FlaskConical size={32} />,
    path: '/feeding/quality',
    color: 'warning',
  },
];

export const FeedingLandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Feeding Management"
        subtitle="Comprehensive feed management system for tracking intake, quality, and performance metrics"
      />

      <Grid container spacing={3}>
        {modules.map((module) => (
          <Grid item xs={12} md={6} key={module.path}>
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
                  onClick={() => navigate(module.path)}
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
              About Feeding Management
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            The Feeding Management module provides comprehensive tools for tracking and optimizing feed consumption across your farm operations. 
            Monitor daily intake, manage feed inventory, ensure quality standards, and analyze performance metrics to improve Feed Conversion Ratio (FCR) and overall efficiency.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
