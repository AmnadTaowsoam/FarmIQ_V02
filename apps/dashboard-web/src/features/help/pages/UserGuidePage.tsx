import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Chip
} from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { 
  BookOpen, 
  CheckCircle, 
  PlayCircle, 
  Users, 
  Settings, 
  BarChart3,
  Zap
} from 'lucide-react';

const guides = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <PlayCircle size={24} />,
    color: 'primary.main',
    steps: [
      {
        title: 'Login to FarmIQ',
        description: 'Access the dashboard using your credentials provided by your administrator.'
      },
      {
        title: 'Select Your Context',
        description: 'Use the context selector in the topbar to choose your organization, farm, and barn.'
      },
      {
        title: 'Explore the Dashboard',
        description: 'View key metrics like FCR, mortality rates, and growth performance on the overview page.'
      },
      {
        title: 'Navigate the Sidebar',
        description: 'Use the sidebar to access different modules: Farms, Batches, Sensors, Feeding, etc.'
      }
    ]
  },
  {
    id: 'managing-farms',
    title: 'Managing Farms & Barns',
    icon: <Users size={24} />,
    color: 'success.main',
    steps: [
      {
        title: 'View Farms',
        description: 'Navigate to Farms in the sidebar to see all farms in your organization.'
      },
      {
        title: 'Add a New Farm',
        description: 'Click "Add Farm" button, enter farm details (name, location, capacity), and save.'
      },
      {
        title: 'Manage Barns',
        description: 'Click on a farm to view its barns. Add barns by clicking "Add Barn" and entering details.'
      },
      {
        title: 'Configure Settings',
        description: 'Set default values, assign managers, and configure barn-specific settings.'
      }
    ]
  },
  {
    id: 'standards',
    title: 'Working with Standards',
    icon: <BarChart3 size={24} />,
    color: 'warning.main',
    steps: [
      {
        title: 'Access Standards Library',
        description: 'Navigate to Standards in the sidebar to view all available standard sets.'
      },
      {
        title: 'Select a Standard Set',
        description: 'Choose the appropriate standard set for your species and genetic line.'
      },
      {
        title: 'Import or Create',
        description: 'Import standards from CSV or create manually by entering target values by age.'
      },
      {
        title: 'Apply to Batches',
        description: 'Assign standard sets to batches to track performance against targets.'
      }
    ]
  },
  {
    id: 'sensors',
    title: 'Setting Up Sensors',
    icon: <Zap size={24} />,
    color: 'info.main',
    steps: [
      {
        title: 'Add Sensors',
        description: 'Go to Sensors > Catalog and click "Add Sensor" to register new IoT devices.'
      },
      {
        title: 'Configure Bindings',
        description: 'Navigate to Sensors > Bindings to assign sensors to specific barns or locations.'
      },
      {
        title: 'Monitor Telemetry',
        description: 'View real-time sensor data in the Telemetry section or on barn detail pages.'
      },
      {
        title: 'Set Up Alerts',
        description: 'Configure alert thresholds to receive notifications when values exceed limits.'
      }
    ]
  }
];

const quickTips = [
  {
    title: 'Use Keyboard Shortcuts',
    description: 'Press Ctrl+K to open sidebar search, Esc to close modals.'
  },
  {
    title: 'Pin Frequently Used Pages',
    description: 'Click the star icon next to menu items to pin them for quick access.'
  },
  {
    title: 'Filter by Time Range',
    description: 'Use the time range selector in the topbar to view historical data.'
  },
  {
    title: 'Export Data',
    description: 'Most tables have an export button to download data as CSV.'
  },
  {
    title: 'Switch Language',
    description: 'Toggle between Thai (TH) and English (EN) using the language selector in the topbar.'
  }
];

export const UserGuidePage: React.FC = () => {
  const [activeStep, setActiveStep] = useState<Record<string, number>>({});

  const handleStepClick = (guideId: string, stepIndex: number) => {
    setActiveStep(prev => ({
      ...prev,
      [guideId]: stepIndex
    }));
  };

  return (
    <Box>
      <PageHeader 
        title="User Guide" 
        subtitle="Step-by-step instructions for using FarmIQ"
      />

      {/* Quick Tips */}
      <PremiumCard title="Quick Tips" sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          {quickTips.map((tip, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle size={18} color="green" />
                  <Typography variant="subtitle2" fontWeight="bold">
                    {tip.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {tip.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PremiumCard>

      {/* Step-by-Step Guides */}
      <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
        Step-by-Step Guides
      </Typography>

      <Grid container spacing={3}>
        {guides.map((guide) => (
          <Grid item xs={12} md={6} key={guide.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: guide.color,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {guide.icon}
                  </Box>
                  <Typography variant="h6" fontWeight="bold">
                    {guide.title}
                  </Typography>
                </Box>

                <Stepper 
                  activeStep={activeStep[guide.id] ?? -1} 
                  orientation="vertical"
                  nonLinear
                >
                  {guide.steps.map((step, index) => (
                    <Step key={index}>
                      <StepLabel
                        onClick={() => handleStepClick(guide.id, index)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <Typography variant="subtitle2" fontWeight="bold">
                          {step.title}
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary">
                          {step.description}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Button
                            size="small"
                            onClick={() => handleStepClick(guide.id, index + 1)}
                          >
                            {index === guide.steps.length - 1 ? 'Finish' : 'Next'}
                          </Button>
                        </Box>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>

                {activeStep[guide.id] === guide.steps.length && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                    <Typography variant="body2" color="success.dark">
                      ✓ Guide completed! You're ready to use this feature.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Additional Resources */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          Additional Resources
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <BookOpen size={24} color="#1976d2" />
                  <Typography variant="h6" fontWeight="bold">
                    Help Center
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Browse articles, FAQs, and troubleshooting guides.
                </Typography>
                <Button variant="text" sx={{ mt: 2 }} href="/help">
                  Visit Help Center →
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Settings size={24} color="#1976d2" />
                  <Typography variant="h6" fontWeight="bold">
                    Video Tutorials
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Watch step-by-step video guides (coming soon).
                </Typography>
                <Chip label="Coming Soon" size="small" sx={{ mt: 2 }} />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Users size={24} color="#1976d2" />
                  <Typography variant="h6" fontWeight="bold">
                    Contact Support
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Get help from our support team via email.
                </Typography>
                <Button variant="text" sx={{ mt: 2 }} href="mailto:support@farmiq.ai">
                  Email Support →
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};
