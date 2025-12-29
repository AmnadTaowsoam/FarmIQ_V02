import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Stack, Button } from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { HealthBadge } from '../../../components/admin/HealthBadge';
import { Activity, Database, HardDrive, Cpu, Network } from 'lucide-react';

export const SystemHealthPage: React.FC = () => {
  // Mock health data
  const services = [
    { name: 'API Gateway', status: 'healthy' as const, uptime: '99.9%', responseTime: '45ms' },
    { name: 'Database', status: 'healthy' as const, uptime: '99.8%', responseTime: '12ms' },
    { name: 'MQTT Broker', status: 'degraded' as const, uptime: '98.5%', responseTime: '120ms' },
    { name: 'Storage Service', status: 'healthy' as const, uptime: '99.9%', responseTime: '8ms' },
    { name: 'Edge Sync', status: 'healthy' as const, uptime: '99.7%', responseTime: '65ms' },
    { name: 'Analytics Engine', status: 'healthy' as const, uptime: '99.6%', responseTime: '95ms' },
  ];

  const systemMetrics = [
    { label: 'CPU Usage', value: '45%', icon: <Cpu size={20} />, color: 'success' as const },
    { label: 'Memory Usage', value: '62%', icon: <Database size={20} />, color: 'warning' as const },
    { label: 'Network I/O', value: '1.2 GB/s', icon: <Network size={20} />, color: 'info' as const },
    { label: 'Disk Usage', value: '38%', icon: <HardDrive size={20} />, color: 'success' as const },
  ];

  return (
    <Box>
      <AdminPageHeader
        title="System Health"
        subtitle="Monitor system services and infrastructure health"
      />

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
            {services.map((service) => (
              <Grid item xs={12} md={6} key={service.name}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body1" fontWeight={600}>
                          {service.name}
                        </Typography>
                        <HealthBadge status={service.status} showIcon />
                      </Stack>

                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            Uptime
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {service.uptime}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            Response Time
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {service.responseTime}
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
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};
