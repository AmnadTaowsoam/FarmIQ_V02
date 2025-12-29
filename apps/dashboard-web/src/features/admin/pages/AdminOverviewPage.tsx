import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Stack, LinearProgress } from '@mui/material';
import { Building2, Warehouse, Home, Server, Activity, AlertTriangle, Database, Wifi } from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { StatCard } from '../../../components/admin/StatCard';
import { HealthBadge } from '../../../components/admin/HealthBadge';
import { StatusPill } from '../../../components/admin/StatusPill';
import { useOverviewStats } from '../../../api/admin/adminQueries';

import { formatDistanceToNow } from 'date-fns';

/**
 * Admin Overview Page
 * 
 * Dashboard showing system-wide metrics, device status, data freshness, alerts, and health.
 */
export const AdminOverviewPage: React.FC = () => {
  const { data: stats, isLoading, error } = useOverviewStats();

  if (error) {
    return (
      <Box>
        <AdminPageHeader title="Admin Overview" subtitle="System-wide metrics and health monitoring" />
        <Card>
          <CardContent>
            <Typography color="error">Failed to load overview statistics</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <AdminPageHeader
        title="Admin Overview"
        subtitle="System-wide metrics and health monitoring"
      />

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Tenants"
            value={stats?.totalTenants || 0}
            icon={<Building2 />}
            color="primary"
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Farms"
            value={stats?.totalFarms || 0}
            icon={<Warehouse />}
            color="success"
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Barns"
            value={stats?.totalBarns || 0}
            icon={<Home />}
            color="info"
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Devices"
            value={stats?.totalDevices || 0}
            icon={<Server />}
            color="warning"
            loading={isLoading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Device Status */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Activity size={20} />
                  <Typography variant="h6" fontWeight={600}>
                    Device Status
                  </Typography>
                </Stack>

                {isLoading ? (
                  <LinearProgress />
                ) : (
                  <>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Wifi size={16} color="green" />
                          <Typography variant="body2">Online</Typography>
                        </Stack>
                        <Typography variant="h6" fontWeight={600}>
                          {stats?.devicesOnline || 0}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={((stats?.devicesOnline || 0) / (stats?.totalDevices || 1)) * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                        color="success"
                      />
                    </Stack>

                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Wifi size={16} color="gray" />
                          <Typography variant="body2">Offline</Typography>
                        </Stack>
                        <Typography variant="h6" fontWeight={600}>
                          {stats?.devicesOffline || 0}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={((stats?.devicesOffline || 0) / (stats?.totalDevices || 1)) * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                        color="error"
                      />
                    </Stack>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Data Freshness */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Database size={20} />
                  <Typography variant="h6" fontWeight={600}>
                    Data Freshness
                  </Typography>
                </Stack>

                {isLoading ? (
                  <LinearProgress />
                ) : (
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Last Data Ingest
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {stats?.lastDataIngest
                          ? formatDistanceToNow(new Date(stats.lastDataIngest), { addSuffix: true })
                          : 'N/A'}
                      </Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Last Sync
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {stats?.lastSync
                          ? formatDistanceToNow(new Date(stats.lastSync), { addSuffix: true })
                          : 'N/A'}
                      </Typography>
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Alerts */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AlertTriangle size={20} />
                  <Typography variant="h6" fontWeight={600}>
                    Top Alerts
                  </Typography>
                </Stack>

                {isLoading ? (
                  <LinearProgress />
                ) : stats?.topAlerts && stats.topAlerts.length > 0 ? (
                  <Stack spacing={1.5}>
                    {stats.topAlerts.map((alert) => (
                      <Stack
                        key={alert.id}
                        direction="row"
                        spacing={1.5}
                        alignItems="flex-start"
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                        }}
                      >
                        <StatusPill
                          label={alert.severity.toUpperCase()}
                          color={
                            alert.severity === 'critical'
                              ? 'error'
                              : alert.severity === 'warning'
                              ? 'warning'
                              : 'info'
                          }
                          size="small"
                        />
                        <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {alert.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                          </Typography>
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No recent alerts
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Activity size={20} />
                  <Typography variant="h6" fontWeight={600}>
                    System Health
                  </Typography>
                </Stack>

                {isLoading ? (
                  <LinearProgress />
                ) : (
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">API</Typography>
                      <HealthBadge status={stats?.systemHealth.api || 'unknown'} showIcon />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Database</Typography>
                      <HealthBadge status={stats?.systemHealth.database || 'unknown'} showIcon />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">MQTT Broker</Typography>
                      <HealthBadge status={stats?.systemHealth.mqtt || 'unknown'} showIcon />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Storage</Typography>
                      <HealthBadge status={stats?.systemHealth.storage || 'unknown'} showIcon />
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
