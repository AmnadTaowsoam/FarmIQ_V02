import React from 'react';
import { Box, Grid, Typography, Stack, alpha, useTheme, Button } from '@mui/material';
import { Building2, Warehouse, Home, Server, Activity, AlertTriangle, Database, Wifi, Users, ShieldCheck, ArrowRight, Info } from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { HealthBadge } from '../../../components/admin/HealthBadge';
import { StatusPill } from '../../../components/admin/StatusPill';
import { useOverviewStats } from '../../../api/admin/adminQueries';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { FadeIn } from '../../../components/motion/FadeIn';
import { Stagger } from '../../../components/motion/Stagger';
import { LoadingScreen } from '../../../components/feedback/LoadingScreen';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../../contexts/AuthContext';

// Admin Metric Card
const AdminMetricCard: React.FC<{
    title: string;
    value: number | string;
    icon: any;
    color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    delay?: number;
}> = ({ title, value, icon: Icon, color, delay = 0 }) => {
    const theme = useTheme();
    
    return (
        <FadeIn delay={delay}>
            <PremiumCard
                variant="elevated"
                sx={{ 
                    height: '100%', 
                    position: 'relative', 
                    overflow: 'hidden',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' }
                }}
            >
                <Box sx={{ 
                    position: 'absolute', 
                    top: -10, 
                    right: -10, 
                    opacity: 0.1, 
                    color: `${color}.main`,
                    transform: 'rotate(15deg)' 
                }}>
                    <Icon size={100} />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ 
                        p: 1.5, 
                        borderRadius: 2, 
                        bgcolor: alpha(theme.palette[color].main, 0.1), 
                        color: `${color}.main`,
                        mr: 2
                    }}>
                        <Icon size={24} />
                    </Box>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {title}
                    </Typography>
                </Box>
                
                <Typography variant="h3" fontWeight={800} sx={{ position: 'relative', zIndex: 1 }}>
                    {value}
                </Typography>
            </PremiumCard>
        </FadeIn>
    );
};

export const AdminOverviewPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const isPlatformAdmin = user?.roles?.includes('platform_admin') ?? false;
  const { data: stats, isLoading, error } = useOverviewStats({ enabled: isPlatformAdmin });

  if (!isPlatformAdmin) {
    return (
      <Box p={4}>
        <AdminPageHeader title="Admin Overview" subtitle="System-wide metrics and health monitoring" />
        <PremiumCard variant="outlined" sx={{ borderColor: 'warning.main', bgcolor: alpha(theme.palette.warning.main, 0.08) }}>
          <Box p={3} display="flex" alignItems="center" gap={2}>
            <AlertTriangle color={theme.palette.warning.main} />
            <Typography color="warning.dark" fontWeight={600}>Overview statistics require platform_admin role.</Typography>
          </Box>
        </PremiumCard>
      </Box>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading system metrics..." />;
  }

  if (error) {
    return (
      <Box p={4}>
        <AdminPageHeader title="Admin Overview" subtitle="System-wide metrics and health monitoring" />
        <PremiumCard variant="outlined" sx={{ borderColor: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.05) }}>
            <Box p={3} display="flex" alignItems="center" gap={2}>
                <AlertTriangle color={theme.palette.error.main} />
                <Typography color="error.main" fontWeight={600}>Failed to load overview statistics</Typography>
            </Box>
        </PremiumCard>
      </Box>
    );
  }

  return (
    <Box pb={4}>
      <AdminPageHeader
        title="Admin Overview"
        subtitle="System-wide metrics and health monitoring"
      />

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <AdminMetricCard
            title="Total Tenants"
            value={stats?.totalTenants || 0}
            icon={Building2}
            color="primary"
            delay={100}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AdminMetricCard
            title="Total Farms"
            value={stats?.totalFarms || 0}
            icon={Warehouse}
            color="success"
            delay={200}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AdminMetricCard
            title="Total Users"
            value={stats?.totalUsers || 0} // Assuming this field exists or needs to be added to types
            icon={Users}
            color="info"
            delay={300}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AdminMetricCard
            title="Total Devices"
            value={stats?.totalDevices || 0}
            icon={Server}
            color="warning"
            delay={400}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Device Status */}
        <Grid item xs={12} md={6} lg={4}>
          <FadeIn delay={500}>
            <PremiumCard title="Device Fleet Status" subtitle="Online vs Offline connectivity" sx={{ height: '100%' }}>
                <Box sx={{ mt: 2 }}>
                    <Stack spacing={3}>
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Wifi size={18} color={theme.palette.success.main} />
                                    <Typography variant="body2" fontWeight={600}>Online</Typography>
                                </Box>
                                <Typography variant="h6" fontWeight={700}>{stats?.devicesOnline || 0}</Typography>
                            </Box>
                            <Box sx={{ height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                                <Box sx={{ 
                                    width: `${((stats?.devicesOnline || 0) / (stats?.totalDevices || 1)) * 100}%`, 
                                    height: '100%', 
                                    bgcolor: 'success.main', 
                                    borderRadius: 4 
                                }} />
                            </Box>
                        </Box>

                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Wifi size={18} color={theme.palette.error.main} />
                                    <Typography variant="body2" fontWeight={600}>Offline</Typography>
                                </Box>
                                <Typography variant="h6" fontWeight={700}>{stats?.devicesOffline || 0}</Typography>
                            </Box>
                            <Box sx={{ height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                                <Box sx={{ 
                                    width: `${((stats?.devicesOffline || 0) / (stats?.totalDevices || 1)) * 100}%`, 
                                    height: '100%', 
                                    bgcolor: 'error.main', 
                                    borderRadius: 4 
                                }} />
                            </Box>
                        </Box>
                    </Stack>
                </Box>
            </PremiumCard>
          </FadeIn>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={6} lg={4}>
          <FadeIn delay={600}>
            <PremiumCard title="System Health" subtitle="Infrastructure component status" sx={{ height: '100%' }}>
                <Stack spacing={2} mt={1}>
                    {[
                        { label: 'API Gateway', status: stats?.systemHealth.api },
                        { label: 'Database Cluster', status: stats?.systemHealth.database },
                        { label: 'MQTT Broker', status: stats?.systemHealth.mqtt },
                        { label: 'Object Storage', status: stats?.systemHealth.storage },
                    ].map((item, i) => (
                        <Box key={i} sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: 'action.hover'
                        }}>
                            <Typography variant="body2" fontWeight={600}>{item.label}</Typography>
                            <HealthBadge status={item.status || 'unknown'} showIcon />
                        </Box>
                    ))}
                </Stack>
            </PremiumCard>
          </FadeIn>
        </Grid>

        {/* Top Alerts */}
        <Grid item xs={12} lg={4}>
          <FadeIn delay={700}>
            <PremiumCard 
                title="Recent System Alerts" 
                subtitle="High priority incidents" 
                sx={{ height: '100%' }}
                action={
                    <Button size="small" endIcon={<ArrowRight size={16} />}>View All</Button>
                }
            >
                {stats?.topAlerts && stats.topAlerts.length > 0 ? (
                  <Stagger sx={{ mt: 1 }}>
                    {stats.topAlerts.map((alert) => (
                      <Box
                        key={alert.id}
                        sx={{
                          p: 2,
                          mb: 1.5,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          gap: 2,
                          alignItems: 'flex-start',
                          transition: 'all 0.2s',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                            borderColor: theme.palette.primary.main
                          }
                        }}
                      >
                        <Box sx={{ mt: 0.5 }}>
                            {alert.severity === 'critical' ? <AlertTriangle size={18} color={theme.palette.error.main} /> :
                             alert.severity === 'warning' ? <AlertTriangle size={18} color={theme.palette.warning.main} /> :
                             <Info size={18} color={theme.palette.info.main} />}
                        </Box>
                        <Box flex={1}>
                            <Typography variant="body2" fontWeight={600} gutterBottom>
                                {alert.message}
                            </Typography>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <StatusPill
                                    label={alert.severity.toUpperCase()}
                                    color={
                                        alert.severity === 'critical' ? 'error' : 
                                        alert.severity === 'warning' ? 'warning' : 'info'
                                    }
                                    size="small"
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                                </Typography>
                            </Box>
                        </Box>
                      </Box>
                    ))}
                  </Stagger>
                ) : (
                  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height={200} textAlign="center">
                    <ShieldCheck size={48} color={theme.palette.success.main} style={{ marginBottom: 16, opacity: 0.5 }} />
                    <Typography variant="body1" fontWeight={600} color="text.secondary">
                        System is healthy
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                        No active alerts at this time
                    </Typography>
                  </Box>
                )}
            </PremiumCard>
          </FadeIn>
        </Grid>
      </Grid>
    </Box>
  );
};
