import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Grid, Typography, alpha, useTheme, Skeleton, Stack, Button } from '@mui/material';
import { AlertCircle, Lightbulb, Activity, ChevronRight, BarChart3, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { api } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';

type ModuleStatus = {
  state: 'loading' | 'ok' | 'empty' | 'unavailable' | 'error';
  count?: number;
  highSeverityCount?: number;
  message?: string;
};

function classifyError(err: any): { unavailable: boolean; message: string } {
  const status = err?.response?.status ?? err?.status;
  if (status === 404 || status === 501) {
    return { unavailable: true, message: 'Not enabled for your plan' };
  }
  return { unavailable: false, message: err?.message || 'Request failed' };
}

export const AiInsightsLandingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { tenantId, farmId, barnId, timeRange } = useActiveContext();

  const [anomalies, setAnomalies] = useState<ModuleStatus>({ state: 'loading' });
  const [recommendations, setRecommendations] = useState<ModuleStatus>({ state: 'loading' });

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    setAnomalies({ state: 'loading' });
    setRecommendations({ state: 'loading' });

    const params = {
      tenant_id: tenantId,
      farm_id: farmId || undefined,
      barn_id: barnId || undefined,
    };

    Promise.allSettled([
      api.analyticsAnomaliesList({
        ...params,
        start_time: timeRange.start.toISOString(),
        end_time: timeRange.end.toISOString(),
        page: 1,
        limit: 100,
      }),
      api.analyticsRecommendationsList({
        ...params,
        page: 1,
        limit: 100,
      }),
    ]).then((results) => {
      if (cancelled) return;

      const [anomalyResult, recommendationResult] = results;

      // Process Anomalies
      if (anomalyResult.status === 'fulfilled') {
        const data = Array.isArray(anomalyResult.value?.data) ? anomalyResult.value.data : [];
        const highSeverity = data.filter((a: any) => a.severity === 'critical' || a.severity === 'high').length;
        setAnomalies({ 
          state: data.length === 0 ? 'empty' : 'ok', 
          count: data.length,
          highSeverityCount: highSeverity
        });
      } else {
        const info = classifyError(anomalyResult.reason);
        setAnomalies(info.unavailable ? { state: 'unavailable', message: info.message } : { state: 'error', message: info.message });
      }

      // Process Recommendations
      if (recommendationResult.status === 'fulfilled') {
        const data = Array.isArray(recommendationResult.value?.data) ? recommendationResult.value.data : [];
        setRecommendations({ state: data.length === 0 ? 'empty' : 'ok', count: data.length });
      } else {
        const info = classifyError(recommendationResult.reason);
        setRecommendations(info.unavailable ? { state: 'unavailable', message: info.message } : { state: 'error', message: info.message });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tenantId, farmId, barnId, timeRange.start, timeRange.end]);

  const cards = useMemo(() => {
    return [
      {
        id: 'anomalies',
        title: 'Anomalies',
        subtitle: 'Detected Issues',
        description: 'AI-detected irregularities requiring attention.',
        icon: <AlertCircle size={24} />,
        color: theme.palette.error.main,
        gradient: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.15)} 0%, ${alpha(theme.palette.background.paper, 0)} 100%)`,
        status: anomalies,
        onClick: () => navigate('/ai/anomalies'),
        actionLabel: 'View Anomalies',
      },
      {
        id: 'recommendations',
        title: 'Recommendations',
        subtitle: 'Optimization Opportunities',
        description: 'Actionable suggestions to improve performance.',
        icon: <Lightbulb size={24} />,
        color: theme.palette.warning.main,
        gradient: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.15)} 0%, ${alpha(theme.palette.background.paper, 0)} 100%)`,
        status: recommendations,
        onClick: () => navigate('/ai/recommendations'),
        actionLabel: 'View Suggestions',
      },
      {
        id: 'insights',
        title: 'Insights Feed',
        subtitle: 'Timeline & Events',
        description: 'Chronological view of all AI activities and alerts.',
        icon: <Activity size={24} />,
        color: theme.palette.info.main,
        gradient: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.15)} 0%, ${alpha(theme.palette.background.paper, 0)} 100%)`,
        status: { state: 'ok' as const, count: undefined }, // Feed is always "ok" generally
        onClick: () => navigate('/ai/insights-feed'),
        actionLabel: 'Open Feed',
      },
      {
        id: 'planning',
        title: 'Scenario Planning',
        subtitle: 'Simulation Tools',
        description: 'Forecast outcomes based on different production variables.',
        icon: <BarChart3 size={24} />,
        color: theme.palette.success.main,
        gradient: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.15)} 0%, ${alpha(theme.palette.background.paper, 0)} 100%)`,
        status: { state: 'ok' as const },
        onClick: () => navigate('/ai/planning'),
        actionLabel: 'Open Planner',
      },
    ];
  }, [theme, anomalies, recommendations, navigate]);

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out', pb: 4 }}>
      <PageHeader
        title="AI Insights"
        subtitle="Real-time analysis, anomaly detection, and optimization recommendations"
      />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {cards.map((card) => {
          const isLoading = card.status.state === 'loading';
          const isError = card.status.state === 'error';
          const isUnavailable = card.status.state === 'unavailable';
          
          return (
            <Grid item xs={12} md={6} lg={3} key={card.id}>
              <PremiumCard
                hoverable
                onClick={card.onClick}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  background: card.gradient,
                  border: '1px solid',
                  borderColor: alpha(card.color, 0.2),
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: card.color,
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 24px ${alpha(card.color, 0.15)}`,
                  }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: alpha(card.color, 0.1),
                      color: card.color,
                      display: 'inline-flex',
                    }}
                  >
                    {card.icon}
                  </Box>
                  {isLoading ? (
                     <Skeleton variant="circular" width={24} height={24} />
                  ) : (
                    <ArrowUpRight size={20} color={theme.palette.text.secondary} style={{ opacity: 0.5 }} />
                  )}
                </Box>

                <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>
                  {card.subtitle}
                </Typography>
                
                <Typography variant="h5" fontWeight={800} sx={{ mb: 1, mt: 0.5 }}>
                  {card.title}
                </Typography>

                <Box sx={{ my: 2, flexGrow: 1 }}>
                   {isLoading ? (
                     <Stack spacing={1}>
                        <Skeleton variant="rectangular" width="40%" height={32} />
                        <Skeleton variant="text" width="80%" />
                     </Stack>
                   ) : isUnavailable ? (
                     <Chip 
                        label="Not Enabled" 
                        size="small" 
                        sx={{ bgcolor: alpha(theme.palette.action.disabled, 0.1), color: 'text.disabled', fontWeight: 600 }} 
                     />
                   ) : isError ? (
                      <Chip 
                        label="Unable to load" 
                        size="small" 
                        color="error" 
                        variant="outlined"
                      />
                   ) : (
                     <Box>
                        {card.status.count !== undefined ? (
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                            <Typography variant="h3" fontWeight={800} color={card.status.count > 0 ? card.color : 'text.primary'}>
                              {card.status.count}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                              active
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>
                             {card.description}
                          </Typography>
                        )}
                        
                        {card.status.highSeverityCount !== undefined && card.status.highSeverityCount > 0 && (
                           <Chip 
                              label={`${card.status.highSeverityCount} Critical`} 
                              size="small" 
                              sx={{ 
                                mt: 1, 
                                bgcolor: theme.palette.error.main, 
                                color: '#fff',
                                fontWeight: 700,
                                height: 20
                              }} 
                           />
                        )}
                     </Box>
                   )}
                </Box>
                
                {!isLoading && !isUnavailable && (
                   <Button 
                      variant="text" 
                      color="inherit" 
                      onClick={(e) => { e.stopPropagation(); card.onClick(); }}
                      endIcon={<ChevronRight size={16} />}
                      sx={{ 
                        justifyContent: 'flex-start', 
                        px: 0, 
                        mt: 'auto',
                        color: theme.palette.text.secondary,
                        '&:hover': { color: card.color, bgcolor: 'transparent' }
                      }}
                   >
                     {card.actionLabel}
                   </Button>
                )}
              </PremiumCard>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};


