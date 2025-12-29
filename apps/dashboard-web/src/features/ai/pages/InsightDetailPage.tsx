import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowLeft, Calendar, TrendingUp } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { format } from 'date-fns';

// Mock data structure - replace with actual API call
interface Insight {
  insight_id: string;
  title: string;
  summary: string;
  key_findings: string[];
  recommended_actions: string[];
  created_at: string;
  severity: 'info' | 'warning' | 'critical';
  scope: {
    farm_id?: string;
    barn_id?: string;
    batch_id?: string;
  };
}

export const InsightDetailPage: React.FC = () => {
  const { insightId } = useParams<{ insightId: string }>();
  const navigate = useNavigate();

  // TODO: Replace with actual API call
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Mock insight data
  const insight: Insight | null = insightId ? {
    insight_id: insightId,
    title: 'Temperature Anomaly Detected in Barn A',
    summary: 'Unusual temperature patterns have been detected in Barn A over the past 48 hours. The average temperature has exceeded the optimal range by 3°C, which may impact animal welfare and growth rates.',
    key_findings: [
      'Average temperature: 32°C (optimal: 28-29°C)',
      'Peak temperature: 35°C at 2:00 PM',
      'Humidity levels remain within normal range',
      'Ventilation system operating at 85% capacity',
    ],
    recommended_actions: [
      'Inspect and clean ventilation system filters',
      'Increase fan speed during peak hours (12 PM - 4 PM)',
      'Monitor animal behavior for signs of heat stress',
      'Consider installing additional cooling systems',
    ],
    created_at: new Date().toISOString(),
    severity: 'warning',
    scope: {
      farm_id: 'farm-001',
      barn_id: 'barn-A',
    },
  } : null;

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <PageHeader
          title="Insight Details"
          breadcrumbs={[
            { label: 'AI & Insights', href: '/ai/insights-feed' },
            { label: 'Insight Details' },
          ]}
        />
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!insight) {
    return (
      <Box>
        <PageHeader
          title="Insight Not Found"
          breadcrumbs={[
            { label: 'AI & Insights', href: '/ai/insights-feed' },
            { label: 'Insight Details' },
          ]}
        />
        <Alert severity="warning" sx={{ mt: 2 }}>
          The requested insight could not be found.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowLeft size={16} />}
          onClick={() => navigate('/ai/insights-feed')}
          sx={{ mt: 2 }}
        >
          Back to Insights Feed
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={insight.title}
        breadcrumbs={[
          { label: 'AI & Insights', href: '/ai/insights-feed' },
          { label: 'Insight Details' },
        ]}
        action={
          <Button
            variant="outlined"
            startIcon={<ArrowLeft size={16} />}
            onClick={() => navigate('/ai/insights-feed')}
          >
            Back to Feed
          </Button>
        }
      />

      <Stack spacing={3} sx={{ mt: 3 }}>
        {/* Metadata */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
              <Chip
                label={insight.severity.toUpperCase()}
                color={getSeverityColor(insight.severity)}
                size="small"
              />
              
              {insight.scope.farm_id && (
                <Chip label={`Farm: ${insight.scope.farm_id}`} size="small" variant="outlined" />
              )}
              
              {insight.scope.barn_id && (
                <Chip label={`Barn: ${insight.scope.barn_id}`} size="small" variant="outlined" />
              )}
              
              {insight.scope.batch_id && (
                <Chip label={`Batch: ${insight.scope.batch_id}`} size="small" variant="outlined" />
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                <Calendar size={16} />
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(insight.created_at), 'PPpp')}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp size={20} />
              Summary
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {insight.summary}
            </Typography>
          </CardContent>
        </Card>

        {/* Key Findings */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Key Findings
            </Typography>
            <Stack spacing={1}>
              {insight.key_findings.map((finding, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                    •
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {finding}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* Recommended Actions */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recommended Actions
            </Typography>
            <Stack spacing={1.5}>
              {insight.recommended_actions.map((action, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    gap: 1,
                    p: 1.5,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 700 }}>
                    {index + 1}.
                  </Typography>
                  <Typography variant="body2">
                    {action}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};
