import React from 'react';
import { Box, Card, CardContent, CardActions, Button, Typography, Grid } from '@mui/material';
import { Camera, TrendingUp, BarChart3, BookOpen } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';

const modules = [
  {
    title: 'Weighing Sessions',
    description: 'View and manage AI-powered weighing sessions with image capture and weight estimation results.',
    icon: <Camera size={32} />,
    path: '/weighvision/sessions',
    color: 'primary',
  },
  {
    title: 'Weight Analytics',
    description: 'Analyze weight trends, growth rates, and distribution patterns across batches and time periods.',
    icon: <BarChart3 size={32} />,
    path: '/weighvision/analytics',
    color: 'success',
  },
  {
    title: 'Weight Distribution',
    description: 'Visualize weight distribution histograms and identify outliers in your livestock populations.',
    icon: <TrendingUp size={32} />,
    path: '/weighvision/distribution',
    color: 'info',
  },
];

export const WeighVisionLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="WeighVision AI"
        subtitle="AI-powered computer vision system for automated livestock weighing and growth monitoring"
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
              About WeighVision AI
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            WeighVision uses advanced computer vision and machine learning to automate livestock weighing without physical scales. 
            The system captures images, estimates weights using AI models, and provides detailed analytics on growth patterns, 
            helping you make data-driven decisions about feeding, health management, and market readiness.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
