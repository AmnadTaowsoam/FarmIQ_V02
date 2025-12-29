import React from 'react';
import { Box, Grid, Typography, Card, CardContent, Chip, Button, alpha } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Lightbulb, Brain, Activity, TrendingUp, ArrowRight } from 'lucide-react';

export const AiOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const metrics = [
    {
      title: 'Active Anomalies',
      value: '12',
      trend: '+3 today',
      icon: <AlertCircle size={24} />,
      color: 'error.main',
      path: '/ai/anomalies'
    },
    {
      title: 'Recommendations',
      value: '5',
      trend: '3 pending',
      icon: <Lightbulb size={24} />,
      color: 'warning.main',
      path: '/ai/recommendations'
    },
    {
      title: 'Active Models',
      value: '3',
      trend: 'All healthy',
      icon: <Brain size={24} />,
      color: 'success.main',
      path: '/ai/models'
    },
    {
      title: 'Predictions Today',
      value: '1,247',
      trend: '+12% vs yesterday',
      icon: <TrendingUp size={24} />,
      color: 'primary.main',
      path: '/ai/insights-feed'
    }
  ];

  const recentInsights = [
    {
      type: 'anomaly',
      title: 'Temperature spike detected',
      description: 'Barn 3 temperature exceeded threshold by 3°C',
      time: '2 hours ago',
      severity: 'high'
    },
    {
      type: 'recommendation',
      title: 'Feeding schedule optimization',
      description: 'Adjust feeding times based on growth patterns',
      time: '5 hours ago',
      severity: 'medium'
    },
    {
      type: 'model',
      title: 'FCR prediction model updated',
      description: 'Model v2.1 deployed with improved accuracy',
      time: '1 day ago',
      severity: 'info'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box>
      <PageHeader 
        title="AI Overview" 
        subtitle="Monitor AI insights, models, and predictions"
      />

      {/* Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => navigate(metric.path)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: (theme) => alpha(theme.palette[metric.color.split('.')[0] as any].main, 0.1),
                      color: metric.color,
                      mr: 2
                    }}
                  >
                    {metric.icon}
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {metric.value}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {metric.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {metric.trend}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Insights */}
        <Grid item xs={12} md={8}>
          <PremiumCard title="Recent Insights">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentInsights.map((insight, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {insight.title}
                    </Typography>
                    <Chip 
                      label={insight.severity} 
                      size="small" 
                      color={getSeverityColor(insight.severity) as any}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {insight.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {insight.time}
                  </Typography>
                </Box>
              ))}
              <Button
                endIcon={<ArrowRight size={16} />}
                onClick={() => navigate('/ai/insights-feed')}
              >
                View All Insights
              </Button>
            </Box>
          </PremiumCard>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <PremiumCard title="Quick Actions">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate('/ai/scenario-planner')}
                startIcon={<Activity size={18} />}
              >
                Run Scenario
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/ai/models')}
                startIcon={<Brain size={18} />}
              >
                View Models
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/ai/model-health')}
                startIcon={<TrendingUp size={18} />}
              >
                Model Health
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/ai/settings')}
              >
                AI Settings
              </Button>
            </Box>
          </PremiumCard>
        </Grid>
      </Grid>
    </Box>
  );
};
