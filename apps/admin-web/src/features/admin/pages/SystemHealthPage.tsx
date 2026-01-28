import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Stack, Button } from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { HealthBadge } from '../../../components/admin/HealthBadge';
import { Activity, Database, HardDrive, Cpu, Network } from 'lucide-react';
import { api, unwrapApiResponse } from '../../../api';

export const SystemHealthPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const response = await api.opsHealth();
      setData(unwrapApiResponse<any>(response) || null);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (error) {
    return <ErrorState title="Failed to load system health" message={error.message} />;
  }

  if (loading && !data) {
    return (
      <Box>
        <AdminPageHeader title="System Health" subtitle="Monitor system services and infrastructure health" />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">Loading system health...</Typography>
        </Box>
      </Box>
    );
  }

  if (!loading && !data) {
    return (
      <Box>
        <AdminPageHeader title="System Health" subtitle="Monitor system services and infrastructure health" />
        <Typography color="text.secondary">No health data available</Typography>
      </Box>
    );
  }

  const metrics = data?.system_metrics || {};
  const services = Array.isArray(data?.services) ? data.services : [];

  const toNumber = (value?: number | string | null) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const formatPercent = (value?: number | string | null) => {
    const numeric = toNumber(value);
    return numeric === null ? '—' : `${Math.round(numeric)}%`;
  };

  const formatMbps = (value?: number | string | null) => {
    const numeric = toNumber(value);
    return numeric === null ? '—' : `${numeric.toFixed(1)} Mbps`;
  };

  const formatMs = (value?: number | string | null) => {
    const numeric = toNumber(value);
    return numeric === null ? '—' : `${Math.round(numeric)}ms`;
  };

  const formatUptime = (value?: number | string | null) => {
    const numeric = toNumber(value);
    return numeric === null ? '—' : `${numeric.toFixed(1)}%`;
  };

  const systemMetrics = [
    { label: 'CPU Usage', value: formatPercent(metrics.cpu_usage_percent), icon: <Cpu size={20} />, color: 'success' },
    { label: 'Memory Usage', value: formatPercent(metrics.memory_usage_percent), icon: <Database size={20} />, color: 'warning' },
    { label: 'Network I/O', value: formatMbps(metrics.network_in_mbps), icon: <Network size={20} />, color: 'info' },
    { label: 'Disk Usage', value: formatPercent(metrics.disk_usage_percent), icon: <HardDrive size={20} />, color: 'success' },
  ];

  return (
    <Box>
      <AdminPageHeader title="System Health" subtitle="Monitor system services and infrastructure health" />

      {/* System Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {systemMetrics.map((metric) => (
          <Grid item xs={12} sm={6} md={3} key={metric.label}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {metric.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {metric.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: (theme) => theme.palette[metric.color].light,
                      color: (theme) => theme.palette[metric.color].dark,
                    }}
                  >
                    {metric.icon}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Services Health */}
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
            <Activity size={20} />
            <Typography variant="h6" fontWeight={600}>
              Services Status
            </Typography>
          </Stack>

          <Grid container spacing={2}>
            {services.map((service: any) => {
              const statusValue = ['healthy', 'degraded', 'critical', 'unknown'].includes(service.status)
                ? service.status
                : 'unknown';
              return (
                <Grid item xs={12} md={6} key={service.name}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body1" fontWeight={600}>
                            {service.name}
                          </Typography>
                          <HealthBadge status={statusValue} showIcon />
                        </Stack>

                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">
                              Uptime
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatUptime(service.uptime_percent)}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">
                              Response Time
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatMs(service.response_time_ms)}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Button size="small" variant="outlined">
                              Details
                            </Button>
                          </Grid>
                        </Grid>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};
