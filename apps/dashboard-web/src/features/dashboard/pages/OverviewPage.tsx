import React from 'react';
import { Grid, Box, Typography, alpha, useTheme, Stack } from '@mui/material';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { useDashboard } from '../../../hooks/useDashboard';
import { StatusChip } from '../../../components/common/StatusChip';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Activity, Warehouse, Building2, Server, LucideIcon } from 'lucide-react';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { TimeSeriesChart } from '../../../components/charts/TimeSeriesChart';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../components/toast/useToast';
import { useDelayedLoading } from '../../../hooks/useDelayedLoading';
import { KpiSkeleton } from '../../../components/loading/KpiSkeleton';
import { ChartSkeleton } from '../../../components/loading/ChartSkeleton';
import { ListSkeleton } from '../../../components/loading/ListSkeleton';

// KPI Card Component
const KPICard: React.FC<{ 
    title: string; 
    value: string; 
    subtext?: string;
    trend?: string; 
    trendType?: 'up' | 'down' | 'neutral'; 
    icon: LucideIcon; 
    accent?: any;
}> = ({ title, value, subtext, trend, trendType = 'neutral', icon: Icon, accent }) => {
    const theme = useTheme();
    
    return (
        <PremiumCard 
            hoverable 
            accent={accent}
            sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                    <Typography 
                        color="text.secondary" 
                        variant="caption" 
                        fontWeight="800" 
                        sx={{ textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.8 }}
                    >
                        {title}
                    </Typography>
                    <Typography variant="h3" fontWeight="800" sx={{ mt: 0.5, letterSpacing: -1 }}>
                        {value}
                    </Typography>
                </Box>
                <Box sx={{ 
                    p: 1.5, 
                    bgcolor: accent ? alpha(theme.palette[accent as 'primary'].main, 0.1) : 'action.hover', 
                    color: accent ? `${accent}.main` : 'text.secondary', 
                    borderRadius: 2.5,
                    display: 'flex' 
                }}>
                    <Icon size={22} strokeWidth={2.2} />
                </Box>
            </Box>

            <Box sx={{ mt: 'auto' }}>
                {subtext && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: trend ? 0.5 : 0 }}>
                        {subtext}
                    </Typography>
                )}
                
                {trend && (
                    <Stack direction="row" spacing={0.75} alignItems="center">
                        <Box sx={{ 
                            display: 'flex', 
                            p: 0.25, 
                            bgcolor: trendType === 'up' ? alpha(theme.palette.success.main, 0.1) : trendType === 'down' ? alpha(theme.palette.error.main, 0.1) : 'action.hover', 
                            borderRadius: 1 
                        }}>
                            {trendType === 'up' ? <TrendingUp size={14} color={theme.palette.success.main} /> : 
                             trendType === 'down' ? <TrendingDown size={14} color={theme.palette.error.main} /> : 
                             <Activity size={14} color={theme.palette.text.secondary} />}
                        </Box>
                        <Typography variant="caption" color={trendType === 'up' ? 'success.main' : trendType === 'down' ? 'error.main' : 'text.secondary'} fontWeight="800">
                            {trend}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight="600">vs last period</Typography>
                    </Stack>
                )}
            </Box>
        </PremiumCard>
    );
};

export const OverviewPage: React.FC = () => {
    const theme = useTheme();
    const { data, isLoading, error, refetch } = useDashboard();
    const toast = useToast();
    const showSkeleton = useDelayedLoading(isLoading);

    const handleRefresh = async () => {
        toast.info('Syncing intelligence...', { persist: true, id: 'sync' } as any);
        try {
            await refetch();
            toast.removeToast('sync');
            toast.success('Intelligence Synced', { description: 'Latest operational data has been retrieved.' });
        } catch (e) {
            toast.removeToast('sync');
            toast.error('Sync Failed', { actionLabel: 'RETRY', onAction: handleRefresh });
        }
    };

    const recentAlerts = (data?.recentAlerts || []).map(alert => {
        const severity = alert.severity || 'info';
        const status = severity === 'critical' ? 'error' : severity === 'warning' ? 'warning' : 'info';
        return {
            msg: alert.message || '—',
            time: alert.occurred_at ? new Date(alert.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
            status,
        };
    });

    const kpis = data?.kpis || {};

    if (showSkeleton) {
        return (
            <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
                <PageHeader 
                    title="Platform Overview" 
                    subtitle="Real-time operational intelligence and fleet performance metrics."
                />
                <Grid container spacing={3}>
                    {[1,2,3,4].map(i => (
                        <Grid item xs={12} sm={6} md={3} key={i}>
                            <KpiSkeleton />
                        </Grid>
                    ))}
                    <Grid item xs={12} md={8}>
                        <ChartSkeleton height={440} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <ListSkeleton rows={6} />
                    </Grid>
                </Grid>
            </Box>
        );
    }
    
    if (error) return <ErrorState title="Telemetry Stream Failed" message={JSON.stringify(error)} onRetry={refetch} />;

    return (
        <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
            <PageHeader 
                title="Platform Overview" 
                subtitle="Real-time operational intelligence and fleet performance metrics."
                primaryAction={{ 
                    label: "Sync Intelligence", 
                    onClick: handleRefresh, 
                    startIcon: <RefreshCw size={18} /> 
                }}
            />

            {/* Remove inline StatusBar - it's now global in MainLayout */}

            <Grid container spacing={3}>
                {/* KPI Section */}
                <Grid item xs={12} sm={6} md={3} lg={3}>
                    <KPICard 
                        title="Farms" 
                        value={String(kpis.total_farms ?? 0)} 
                        subtext="Active production realms"
                        trend="+2.4%"
                        trendType="up"
                        icon={Warehouse} 
                        accent="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3} lg={3}>
                    <KPICard 
                        title="Barns" 
                        value={String(kpis.total_barns ?? 0)} 
                        subtext="Monitored enclosures"
                        trend="+1.2%"
                        trendType="up"
                        icon={Building2} 
                        accent="info"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3} lg={3}>
                    <KPICard 
                        title="Incidents" 
                        value={String(kpis.critical_alerts ?? 0)} 
                        subtext="Active security/health alerts"
                        trend="-14%"
                        trendType="up" // Up is good here? Usually trend indicators just show direction. Let's say Down is good for alerts.
                        icon={AlertTriangle} 
                        accent="error"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3} lg={3}>
                    <KPICard 
                        title="Hardware" 
                        value={String(kpis.active_devices ?? 0)} 
                        subtext="IOT Assets online"
                        trend="99.9%"
                        trendType="neutral"
                        icon={Server} 
                        accent="success"
                    />
                </Grid>

                {/* Main Content Area */}
                <Grid item xs={12} md={8} xl={7}>
                    <PremiumCard title="Weight Growth Trajectory" subtitle="Average flock weight trends across all active batches (7 day window)">
                        {(data?.weightTrend || []).length > 0 ? (
                            <TimeSeriesChart
                                data={(data?.weightTrend || []).map((w) => ({
                                    timestamp: w.date || '',
                                    weight: w.avg_weight_kg || 0,
                                }))}
                                lines={[{ key: 'weight', label: 'Average Weight (kg)', color: theme.palette.primary.main }]}
                                height={340}
                            />
                        ) : (
                            <EmptyState 
                                variant="NoTelemetryInRange" 
                                onAction={refetch}
                            />
                        )}
                    </PremiumCard>
                </Grid>

                <Grid item xs={12} md={4} xl={5}>
                    <PremiumCard title="Forensic Alerts" subtitle="Most recent prioritized system events" noPadding sx={{ height: '100%' }}>
                        {recentAlerts.length > 0 ? (
                            <Box sx={{ py: 1 }}>
                                {recentAlerts.map((alert, i) => (
                                    <Box key={i} sx={{ 
                                        px: 3,
                                        py: 2, 
                                        borderBottom: i === recentAlerts.length - 1 ? 'none' : '1px solid', 
                                        borderColor: 'divider', 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        transition: 'background-color 0.2s',
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }
                                    }}>
                                        <Box>
                                            <Typography variant="body2" fontWeight="700">{alert.msg}</Typography>
                                            <Typography variant="caption" color="text.secondary" fontWeight="600">{alert.time}</Typography>
                                        </Box>
                                        <StatusChip status={alert.status as any} label={alert.status.toUpperCase()} />
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Box sx={{ p: 4, height: '100%', display: 'flex' }}>
                                <EmptyState
                                    variant="NoAlerts"
                                />
                            </Box>
                        )}
                    </PremiumCard>
                </Grid>
            </Grid>
        </Box>
    );
};
