import React from 'react';
import { Grid, Box, Typography, alpha, useTheme, Stack, Button } from '@mui/material';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { useDashboard } from '../../../hooks/useDashboard';
import { StatusChip } from '../../../components/common/StatusChip';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Activity, Warehouse, Building2, Server, LucideIcon, ArrowRight } from 'lucide-react';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { TimeSeriesChart } from '../../../components/charts/TimeSeriesChart';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useToast } from '../../../components/toast/useToast';
import { useDelayedLoading } from '../../../hooks/useDelayedLoading';
import { KpiSkeleton } from '../../../components/loading/KpiSkeleton';
import { ChartSkeleton } from '../../../components/loading/ChartSkeleton';
import { ListSkeleton } from '../../../components/loading/ListSkeleton';
import { FadeIn } from '../../../components/motion/FadeIn';
import { Stagger } from '../../../components/motion/Stagger';
import { GaugeChart } from '../../../components/charts/GaugeChart';

// Metric Card Component
const MetricCard: React.FC<{ 
    title: string; 
    value: string; 
    subtext?: string;
    trend?: string; 
    trendType?: 'up' | 'down' | 'neutral'; 
    icon: LucideIcon; 
    accent?: any;
    delay?: number;
}> = ({ title, value, subtext, trend, trendType = 'neutral', icon: Icon, accent, delay = 0 }) => {
    const theme = useTheme();
    
    return (
        <FadeIn delay={delay}>
            <PremiumCard 
                hoverable 
                accent={accent}
                variant="glass"
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
            >
                {/* Background Decoration */}
                <Box sx={{ 
                    position: 'absolute', 
                    top: -20, 
                    right: -20, 
                    opacity: 0.05, 
                    transform: 'rotate(15deg)',
                    color: accent ? `${accent}.main` : 'text.primary'
                }}>
                    <Icon size={120} />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, position: 'relative', zIndex: 1 }}>
                    <Box>
                        <Typography 
                            color="text.secondary" 
                            variant="caption" 
                            fontWeight="700" 
                            sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}
                        >
                            {title}
                        </Typography>
                        <Typography variant="h3" fontWeight="800" sx={{ mt: 1, letterSpacing: '-0.03em', color: 'text.primary' }}>
                            {value}
                        </Typography>
                    </Box>
                    <Box sx={{ 
                        p: 1.2, 
                        bgcolor: accent ? alpha(theme.palette[accent as 'primary'].main, 0.1) : 'action.hover', 
                        color: accent ? `${accent}.main` : 'text.secondary', 
                        borderRadius: 2,
                        display: 'flex',
                        boxShadow: `0 4px 12px ${accent ? alpha(theme.palette[accent as 'primary'].main, 0.2) : 'rgba(0,0,0,0.05)'}`
                    }}>
                        <Icon size={24} strokeWidth={2} />
                    </Box>
                </Box>

                <Box sx={{ mt: 'auto', position: 'relative', zIndex: 1 }}>
                    {trend && (
                        <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                            <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.25,
                                bgcolor: trendType === 'up' ? alpha(theme.palette.success.main, 0.1) : trendType === 'down' ? alpha(theme.palette.error.main, 0.1) : 'action.hover', 
                                borderRadius: 1,
                                color: trendType === 'up' ? 'success.main' : trendType === 'down' ? 'error.main' : 'text.secondary'
                            }}>
                                {trendType === 'up' ? <TrendingUp size={14} /> : 
                                 trendType === 'down' ? <TrendingDown size={14} /> : 
                                 <Activity size={14} />}
                                <Typography variant="caption" fontWeight="800">
                                    {trend}
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="500">vs last week</Typography>
                        </Stack>
                    )}
                    {subtext && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block' }}>
                            {subtext}
                        </Typography>
                    )}
                </Box>
            </PremiumCard>
        </FadeIn>
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
        <Box sx={{ pb: 4 }}>
            <PageHeader 
                title="Platform Overview" 
                subtitle="Real-time operational intelligence and fleet performance metrics."
                primaryAction={{ 
                    label: "Sync Intelligence", 
                    onClick: handleRefresh, 
                    startIcon: <RefreshCw size={18} /> 
                }}
            />

            {/* Hero Greeting */}
            <FadeIn delay={100}>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" fontWeight="800" gutterBottom sx={{ 
                        background: theme.palette.primary.gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        display: 'inline-block'
                    }}>
                        Good morning, Farm Manager
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                        Your fleet is operating at <Box component="span" fontWeight="700" color="success.main">98% efficiency</Box>. 
                        There are <Box component="span" fontWeight="700" color="warning.main">{kpis.critical_alerts || 0} alerts</Box> requiring attention today.
                    </Typography>
                </Box>
            </FadeIn>

            <Grid container spacing={3}>
                {/* KPI Section */}
                <Grid item xs={12} sm={6} md={3} lg={3}>
                    <MetricCard 
                        title="Farms" 
                        value={String(kpis.total_farms ?? 0)} 
                        subtext="Active production realms"
                        trend="+2.4%"
                        trendType="up"
                        icon={Warehouse} 
                        accent="primary"
                        delay={200}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3} lg={3}>
                    <MetricCard 
                        title="Barns" 
                        value={String(kpis.total_barns ?? 0)} 
                        subtext="Monitored enclosures"
                        trend="+1.2%"
                        trendType="up"
                        icon={Building2} 
                        accent="info"
                        delay={300}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3} lg={3}>
                    <MetricCard 
                        title="Incidents" 
                        value={String(kpis.critical_alerts ?? 0)} 
                        subtext="Active security/health alerts"
                        trend="-14%"
                        trendType="up" // Up is good here? Usually trend indicators just show direction. Let's say Down is good for alerts.
                        icon={AlertTriangle} 
                        accent="error"
                        delay={400}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3} lg={3}>
                    <MetricCard 
                        title="Hardware" 
                        value={String(kpis.active_devices ?? 0)} 
                        subtext="IOT Assets online"
                        trend="99.9%"
                        trendType="neutral"
                        icon={Server} 
                        accent="success"
                        delay={500}
                    />
                </Grid>

                {/* Main Content Area */}
                <Grid item xs={12} md={8} xl={7}>
                    <FadeIn delay={600}>
                        <PremiumCard 
                            title="Weight Growth Trajectory" 
                            subtitle="Average flock weight trends across all active batches (7 day window)"
                            variant="elevated"
                            sx={{ height: '100%' }}
                        >
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
                    </FadeIn>
                </Grid>

                <Grid item xs={12} md={4} xl={5}>
                    <FadeIn delay={700}>
                        <PremiumCard 
                            title="Forensic Alerts" 
                            subtitle="Most recent prioritized system events" 
                            noPadding 
                            sx={{ height: '100%' }}
                            action={
                                <Button size="small" endIcon={<ArrowRight size={16} />} sx={{ fontWeight: 600 }}>
                                    View All
                                </Button>
                            }
                        >
                            {recentAlerts.length > 0 ? (
                                <Stagger sx={{ py: 1 }}>
                                    {recentAlerts.map((alert, i) => (
                                        <Box key={i} sx={{ 
                                            px: 3,
                                            py: 2, 
                                            borderBottom: i === recentAlerts.length - 1 ? 'none' : '1px solid', 
                                            borderColor: alpha(theme.palette.divider, 0.5), 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            transition: 'all 0.2s',
                                            '&:hover': { 
                                                bgcolor: alpha(theme.palette.primary.main, 0.02),
                                                transform: 'translateX(4px)'
                                            }
                                        }}>
                                            <Box>
                                                <Typography variant="body2" fontWeight="600" color="text.primary">{alert.msg}</Typography>
                                                <Typography variant="caption" color="text.secondary" fontWeight="500">{alert.time}</Typography>
                                            </Box>
                                            <StatusChip status={alert.status as any} label={alert.status.toUpperCase()} size="small" />
                                        </Box>
                                    ))}
                                </Stagger>
                            ) : (
                                <Box sx={{ p: 4, height: '100%', display: 'flex' }}>
                                    <EmptyState
                                        variant="NoAlerts"
                                    />
                                </Box>
                            )}
                        </PremiumCard>
                    </FadeIn>
                </Grid>
                
                {/* Additional Widgets Row (Example: Feed Efficiency & Environment) */}
                <Grid item xs={12} md={6}>
                    <FadeIn delay={800}>
                        <PremiumCard title="Feed Efficiency" subtitle="Current FCR Performance">
                             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                                <GaugeChart 
                                    value={1.45} 
                                    min={1.0} 
                                    max={2.0} 
                                    label="FCR" 
                                    height={200} 
                                    formatValue={(v) => v.toFixed(2)}
                                    color={theme.palette.accent.teal}
                                />
                             </Box>
                        </PremiumCard>
                    </FadeIn>
                </Grid>
                <Grid item xs={12} md={6}>
                    <FadeIn delay={900}>
                        <PremiumCard title="Environmental Health" subtitle="Average conditions across barns">
                            <Box sx={{ p: 2 }}>
                                <Stack spacing={3}>
                                    <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2" fontWeight="600">Temperature Stability</Typography>
                                            <Typography variant="body2" fontWeight="700" color="success.main">98%</Typography>
                                        </Box>
                                        <Box sx={{ height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                                            <Box sx={{ width: '98%', height: '100%', bgcolor: 'success.main', borderRadius: 4 }} />
                                        </Box>
                                    </Box>
                                    <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2" fontWeight="600">Humidity Control</Typography>
                                            <Typography variant="body2" fontWeight="700" color="warning.main">85%</Typography>
                                        </Box>
                                        <Box sx={{ height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                                            <Box sx={{ width: '85%', height: '100%', bgcolor: 'warning.main', borderRadius: 4 }} />
                                        </Box>
                                    </Box>
                                    <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2" fontWeight="600">Air Quality (NH3)</Typography>
                                            <Typography variant="body2" fontWeight="700" color="success.main">100%</Typography>
                                        </Box>
                                        <Box sx={{ height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                                            <Box sx={{ width: '100%', height: '100%', bgcolor: 'success.main', borderRadius: 4 }} />
                                        </Box>
                                    </Box>
                                </Stack>
                            </Box>
                        </PremiumCard>
                    </FadeIn>
                </Grid>
            </Grid>
        </Box>
    );
};
