import { useState } from 'react';
import { 
    Grid, 
    Card, 
    CardContent, 
    Typography, 
    Box, 
    Chip, 
    Stack, 
    Button,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Skeleton,
    CircularProgress, 
    CircularProgressProps,
    Alert
} from '@mui/material';
import { 
    FileText, 
    Download, 
    ClipboardCopy, 
    Cpu, 
    HardDrive, 
    Activity, 
    RefreshCw
} from 'lucide-react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useSettings } from '@/contexts/SettingsContext';
import { edgeOpsApi } from '@/api/client';
import { SERVICE_REGISTRY, ServiceDef } from '@/config/services';
import { MetricCard } from '@/components/ui/MetricCard';

export function OverviewTab() {
    // 1. Context & State
    const settings = useSettings();
    const { getServiceUrl, tenantId, apiKey } = settings;
    const [filter, setFilter] = useState<string>('all');
    const [diagLoading, setDiagLoading] = useState(false);

    // 2. Data Fetching (REAL API calls)
    
    // A. System Status (KPIs)
    const { 
        data: edgeStatus, 
        isLoading: loadingStatus,
        isError: errorStatus,
        refetch: refetchStatus
    } = useQuery({
        queryKey: ['edge-status', tenantId],
        queryFn: () => edgeOpsApi.getStatus({ tenantId, apiKey, getServiceUrl }),
        refetchInterval: 5000
    });

    // B. Detailed Service Health (Parallel Queries)
    const serviceQueries = useQueries({
        queries: SERVICE_REGISTRY.map(svc => {
            const isCritical = ['EDGE_INGRESS_GATEWAY', 'EDGE_SYNC_FORWARDER', 'EDGE_MQTT_BROKER'].includes(svc.key);
            return {
                queryKey: ['service-health', svc.key],
                queryFn: () => edgeOpsApi.checkService(svc, { tenantId, apiKey, getServiceUrl }),
                refetchInterval: isCritical ? 5000 : 15000,
            };
        })
    });

    // C. Stats Queries (NEW - Real data from backend)
    const { 
        data: telemetryStats,
        isLoading: telemetryStatsLoading,
        isError: telemetryStatsError
    } = useQuery({
        queryKey: ['telemetry-stats', tenantId],
        queryFn: () => edgeOpsApi.getTelemetryStats({ tenantId, apiKey, getServiceUrl }),
        refetchInterval: 5000
    });

    const { 
        data: mediaStats,
        isLoading: mediaStatsLoading,
        isError: mediaStatsError
    } = useQuery({
        queryKey: ['media-stats', tenantId],
        queryFn: () => edgeOpsApi.getMediaStats({ tenantId, apiKey, getServiceUrl }),
        refetchInterval: 5000
    });

    const { 
        data: visionStats,
        isLoading: visionStatsLoading,
        isError: visionStatsError
    } = useQuery({
        queryKey: ['vision-stats', tenantId],
        queryFn: () => edgeOpsApi.getVisionStats({ tenantId, apiKey, getServiceUrl }),
        refetchInterval: 5000
    });

    // 3. Handlers
    const handleFilterChange = (_: any, newFilter: string) => {
        if (newFilter) setFilter(newFilter);
    };

    const handleExportDiagnostics = async () => {
        setDiagLoading(true);
        try {
            const bundle = await edgeOpsApi.getDiagnosticsBundle(settings, { tenantId, apiKey, getServiceUrl });
            const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `edge-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Failed to export diagnostics: ' + e);
        } finally {
            setDiagLoading(false);
        }
    };

    const handleCopySupportText = async () => {
        const formatPercent = (value: number | null | undefined): string => {
            if (value === null || value === undefined || Number.isNaN(value)) return '--';
            return `${value.toFixed(2)}%`;
        };

        const lines = [
            `[${new Date().toLocaleString()}] Edge Ops Support Report`,
            `Status: ${edgeStatus?.health?.status || 'UNKNOWN'}`,
            `Uptime: ${edgeStatus?.health?.uptime || '?'}s`,
            `Version: ${edgeStatus?.health?.version || '?'}`,
            '',
            'Resources:',
            `- CPU: ${formatPercent(edgeStatus?.resources?.cpuUsage)}`,
            `- Mem: ${formatPercent(edgeStatus?.resources?.memoryUsage)}`,
            `- Disk: ${formatPercent(edgeStatus?.resources?.diskUsage?.usedPercent)} (${edgeStatus?.resources?.diskUsage?.freeGb}GB Free)`,
            '',
            'Sync:',
            `- Backlog: ${edgeStatus?.sync?.pendingCount}`,
            `- DLQ: ${edgeStatus?.sync?.dlqCount}`,
            '',
            'Critical Services:'
        ];

        serviceQueries.forEach((q, idx) => {
            const def = SERVICE_REGISTRY[idx];
            const isCritical = ['EDGE_INGRESS_GATEWAY', 'EDGE_SYNC_FORWARDER', 'EDGE_MQTT_BROKER'].includes(def.key);
            if (isCritical || q.data?.status === 'down') {
                lines.push(`- ${def.name}: ${q.data?.status?.toUpperCase() || 'UNKNOWN'} (${q.data?.details || 'No details'})`);
            }
        });

        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            alert('Support text copied to clipboard!');
        } catch (e) {
            alert('Clipboard write failed');
        }
    };

    // 4. Aggregations
    const servicesWithStatus = SERVICE_REGISTRY.map((def, idx) => ({
        def,
        status: serviceQueries[idx].data,
        error: serviceQueries[idx].error
    }));

    const filteredServices = servicesWithStatus.filter(({ def, error }) => {
        if (filter === 'all') return true;
        if (filter === 'http') return def.hasHttp;
        if (filter === 'tcp') return !def.hasHttp;
        if (filter === 'critical') return ['EDGE_INGRESS_GATEWAY', 'EDGE_SYNC_FORWARDER', 'EDGE_MQTT_BROKER'].includes(def.key);
        if (filter === 'down') return !!error || ((status as any)?.status === 'down');
        return true;
    });

    const upCount = serviceQueries.filter(q => q.data?.status === 'up').length;
    const totalCount = SERVICE_REGISTRY.length;
    const isAllUp = upCount === totalCount;
    const percentUp = Math.round((upCount / totalCount) * 100);

    const formatPercent = (value: number | null | undefined): string => {
        if (value === null || value === undefined || Number.isNaN(value)) return '--';
        return `${value.toFixed(2)}%`;
    };

    return (
        <Stack spacing={4}>
            {/* --- Top Strip: System KPIs (with REAL data) --- */}
            {errorStatus ? (
                <Alert severity="error" action={<Button size="small" color="inherit" onClick={() => refetchStatus()}>Retry</Button>}>
                    Failed to load System Status. The Observability Agent might be unreachable.
                </Alert>
            ) : (
                <Grid container spacing={2}>
                    <MetricCard 
                        title="Telemetry Readings" 
                        value={telemetryStats?.totalReadings?.toLocaleString() || '--'} 
                        subValue={telemetryStats?.lastReadingAt ? new Date(telemetryStats.lastReadingAt).toLocaleString() : 'Never'}
                        icon={<FileText color="#10b981" />}
                        loading={telemetryStatsLoading}
                        alert={telemetryStatsLoading || telemetryStatsError}
                    />
                    <MetricCard 
                        title="Media Objects" 
                        value={mediaStats?.totalObjects?.toLocaleString() || '--'} 
                        subValue={mediaStats?.lastCreated ? new Date(mediaStats.lastCreated).toLocaleString() : 'Never'}
                        icon={<Download color="#10b981" />}
                        loading={mediaStatsLoading}
                        alert={mediaStatsLoading || mediaStatsError}
                    />
                    <MetricCard 
                        title="Inference Results" 
                        value={visionStats?.totalResults?.toLocaleString() || '--'} 
                        subValue={visionStats?.lastResultAt ? new Date(visionStats.lastResultAt).toLocaleString() : 'Never'}
                        icon={<Activity color="#10b981" />}
                        loading={visionStatsLoading}
                        alert={visionStatsLoading || visionStatsError}
                    />
                    <MetricCard 
                        title="CPU Usage" 
                        value={formatPercent(edgeStatus?.resources?.cpuUsage)} 
                        icon={<Cpu color={(edgeStatus?.resources?.cpuUsage ?? 0) > 80 ? '#ef4444' : '#3b82f6'} />}
                        loading={loadingStatus}
                    />
                    <MetricCard 
                        title="Memory" 
                        value={formatPercent(edgeStatus?.resources?.memoryUsage)} 
                        icon={<Activity color={(edgeStatus?.resources?.memoryUsage ?? 0) > 85 ? '#f59e0b' : '#3b82f6'} />}
                        loading={loadingStatus}
                    />
                    <MetricCard 
                        title="Disk (/data)" 
                        value={formatPercent(edgeStatus?.resources?.diskUsage?.usedPercent)} 
                        subValue={edgeStatus ? `${edgeStatus?.resources?.diskUsage?.freeGb} GB Free` : ''}
                        icon={<HardDrive color={(edgeStatus?.resources?.diskUsage?.usedPercent ?? 0) > 90 ? '#ef4444' : '#10b981'} />}
                        loading={loadingStatus}
                    />
                    <MetricCard 
                        title="Sync Backlog" 
                        value={edgeStatus?.sync?.pendingCount?.toLocaleString() ?? '--'} 
                        icon={<RefreshCw color="#6366f1" />}
                        loading={loadingStatus}
                    />
                    <MetricCard 
                        title="DLQ Events" 
                        value={edgeStatus?.sync?.dlqCount?.toLocaleString() ?? '--'} 
                        icon={<Alert severity="error" sx={{ p:0, bgcolor: 'transparent', '& .MuiAlert-icon': { mr: 0 } }} iconMapping={{ error: <Activity /> }} />}
                        color={(edgeStatus?.sync?.dlqCount ?? 0) > 0 ? '#ef4444' : '#10b981'}
                        loading={loadingStatus}
                        alert={(edgeStatus?.sync?.dlqCount ?? 0) > 0}
                    />
                </Grid>
            )}

            {/* --- Service Registry & Actions --- */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight="bold">Service Registry</Typography>
                    <Stack direction="row" alignItems="center" spacing={2} mt={0.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StatusProgress value={percentUp} color={isAllUp ? 'success' : 'warning'} />
                            <Box>
                                <Typography variant="caption" display="block" lineHeight={1} fontWeight="bold">OPERATIONAL</Typography>
                                <Typography variant="caption" color="text.secondary">{upCount}/{totalCount} Services Up</Typography>
                            </Box>
                        </Box>
                         <Chip 
                            label={loadingStatus ? 'Checking...' : (isAllUp ? 'All Systems Go' : 'Degraded')} 
                            color={isAllUp ? "success" : "warning"} 
                            variant="outlined"
                            size="small" 
                            sx={{ fontWeight: 'bold' }}
                         />
                    </Stack>
                </Box>
                
                <Stack direction="row" spacing={2}>
                    <Tooltip title="Copy text report for support">
                        <Button 
                            variant="outlined" 
                            startIcon={<ClipboardCopy size={16} />}
                            onClick={handleCopySupportText}
                        >
                            Copy Status
                        </Button>
                    </Tooltip>
                    <Tooltip title="Download comprehensive JSON bundle">
                        <Button 
                            variant="contained" 
                            startIcon={diagLoading ? <Skeleton width={20} /> : <Download size={16} />}
                            onClick={handleExportDiagnostics}
                            disabled={diagLoading}
                        >
                            Export Diagnostics
                        </Button>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* --- Filters & Grid --- */}
            <ToggleButtonGroup 
                value={filter} 
                exclusive 
                onChange={handleFilterChange} 
                size="small"
                color="primary"
            >
                <ToggleButton value="all">All Services</ToggleButton>
                <ToggleButton value="critical">Critical</ToggleButton>
                <ToggleButton value="http">HTTP</ToggleButton>
                <ToggleButton value="tcp">TCP</ToggleButton>
            </ToggleButtonGroup>

            {/* Grid */}
            <Grid container spacing={2}>
                {filteredServices.map(({ def, status, error }) => (
                    <Grid item xs={12} md={6} lg={4} key={def.key}>
                        <ServiceRegistryCard def={def} status={status} error={error} loading={!status && !error} />
                    </Grid>
                ))}
            </Grid>
        </Stack>
    );
}

// --- Sub-Components ---

import { classifyError, generateCurlCommand } from '@/lib/diagnostics';
import { Terminal } from 'lucide-react';

function StatusProgress(props: CircularProgressProps & { value: number }) {
    return (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress variant="determinate" {...props} />
            <Box
                sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Typography variant="caption" component="div" color="text.secondary" fontWeight="bold">
                    {`${Math.round(props.value)}%`}
                </Typography>
            </Box>
        </Box>
    );
}

function ServiceRegistryCard({ def, status, error, loading }: { def: ServiceDef, status?: any, error?: Error | null, loading?: boolean }) {
    const settings = useSettings();
    const isUp = status?.status === 'up';
    const diag = error ? classifyError(error) : null;
    
    const handleCopyCurl = () => {
        // Construct the health check URL
        const baseUrl = settings.getServiceUrl(def.key);
        const url = `${baseUrl}${def.healthPath || '/api/health'}`;
        const cmd = generateCurlCommand(url, {
             tenantId: settings.tenantId,
             apiKey: settings.apiKey
        });
        navigator.clipboard.writeText(cmd);
        alert('Curl command copied!');
    };
    
    return (
        <Card variant="outlined" sx={{ 
            height: '100%', 
            transition: 'border-color 0.2s',
            borderColor: isUp ? 'success.light' : (loading ? 'divider' : 'error.main'),
            position: 'relative',
            overflow: 'visible',
            '&:hover': { borderColor: 'primary.main', boxShadow: 1 } 
        }}>
            <CardContent>
                <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                             {/* Status Indicator Dot */}
                            <Box sx={{ 
                                width: 12, height: 12, borderRadius: '50%', 
                                bgcolor: loading ? 'grey.300' : (isUp ? 'success.main' : 'error.main'),
                                boxShadow: isUp ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none'
                             }} />
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>
                                    {def.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {def.hasHttp ? 'HTTP Service' : `TCP Port ${def.tcpProbe?.port}`}
                                </Typography>
                            </Box>
                        </Stack>
                        
                        {loading ? (
                            <Skeleton width={50} height={24} />
                        ) : (
                            <Chip 
                                label={isUp ? 'ONLINE' : (diag ? 'ERROR' : 'OFFLINE')} 
                                color={isUp ? 'success' : 'error'} 
                                size="small" 
                                sx={{ fontWeight: '800', fontSize: '0.65rem', height: 20 }}
                            />
                        )}
                    </Stack>

                     {/* Description or Error Detail */}
                     {diag ? (
                         <Alert severity="error" icon={false} sx={{ py: 0, px: 1, '& .MuiAlert-message': { p: 1, width: '100%' } }}>
                             <Typography variant="caption" fontWeight="bold" display="block">
                                 {diag.reason}
                             </Typography>
                             <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.9 }}>
                                 fix: {diag.fix}
                             </Typography>
                         </Alert>
                     ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40, fontSize: '0.85rem' }}>
                            {def.description}
                        </Typography>
                     )}

                    <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
                         <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                                LATENCY
                            </Typography>
                            <Typography variant="caption" fontWeight="bold" fontFamily="monospace">
                                {loading ? '...' : (status?.latencyMs ? `${status?.latencyMs}ms` : (diag ? 'N/A' : '-'))}
                            </Typography>
                        </Stack>
                    </Box>

                    {/* Actions */}
                    <Stack direction="row" spacing={1} mt={1} justifyContent="flex-end">
                        {/* Copy Curl Button (Always visible for HTTP services) */}
                        {def.hasHttp && (
                            <Tooltip title="Copy Curl Command">
                                <Button 
                                    size="small" 
                                    variant="outlined" 
                                    color="inherit"
                                    sx={{ minWidth: 32, px: 1 }}
                                    onClick={handleCopyCurl}
                                >
                                    <Terminal size={14} />
                                </Button>
                            </Tooltip>
                        )}
                        
                        {def.hasHttp && (
                            <Tooltip title="View OpenAPI Specs">
                                <Button 
                                    size="small" 
                                    variant="outlined" 
                                    startIcon={<FileText size={14} />}
                                    href={`${settings.getServiceUrl(def.key)}${def.docsPath || '/api-docs/openapi.json'}`}
                                    target="_blank"
                                    disabled={loading || !isUp}
                                    sx={{ py: 0.5, fontSize: '0.7rem', flexGrow: 1 }}
                                >
                                    API Docs
                                </Button>
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
}
