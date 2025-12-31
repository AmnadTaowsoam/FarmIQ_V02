import { useState, useEffect } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Stack, 
  Box,
  Alert,
  AlertTitle
} from '@mui/material';
import { 
  Inbox, 
  AlertTriangle, 
  Filter, 
  Copy,
  Terminal,
  Clock
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useSettings } from '@/contexts/SettingsContext';
import { usePoll } from '@/hooks/usePoll';
import { edgeOpsApi } from '@/api/client';
import { MetricCard } from '@/components/ui/MetricCard';

interface DataPoint {
    time: string;
    total: number;
    deduped: number;
}

export function IngressTab() {
    const { tenantId, apiKey, refreshInterval, lastRefresh, getServiceUrl } = useSettings();
    const [history, setHistory] = useState<DataPoint[]>([]);

    const { 
        data: stats, 
        isLoading,
        isError,
        refetch
    } = usePoll(
        ['ingress-stats', lastRefresh, tenantId],
        () => edgeOpsApi.getIngressStats({ tenantId, apiKey, getServiceUrl }),
        refreshInterval
    );

    // Update history when new stats arrive
    useEffect(() => {
        if (stats) {
            setHistory(prev => {
                const now = new Date().toLocaleTimeString('en-US', { hour12: false });
                const newPoint = { 
                    time: now, 
                    total: stats.messages_total, 
                    deduped: stats.messages_deduped_total 
                };
                const newHistory = [...prev, newPoint];
                return newHistory.slice(-20); // Keep last 20 points
            });
        }
    }, [stats]);

    // Derived Metrics
    const total = stats?.messages_total || 0;
    const deduped = stats?.messages_deduped_total || 0;
    const invalid = stats?.messages_invalid_total || 0;
    const dedupeRate = total > 0 ? ((deduped / total) * 100).toFixed(1) : '0.0';
    const hasTraffic = !!stats?.lastMessageAt || history.some((p) => p.total > 0 || p.deduped > 0);

    const handleCopyCurl = () => {
        const url = `${getServiceUrl('EDGE_INGRESS_GATEWAY')}/api/v1/ingress/stats`;
        const curl = `curl -X GET "${url}" \\\n  -H "x-tenant-id: ${tenantId}"${apiKey ? ` \\\n  -H "x-api-key: ${apiKey}"` : ''}`;
        navigator.clipboard.writeText(curl);
        // Could implement toast logic here if needed
    };

    return (
        <Stack spacing={4}>
            {isError && (
                <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetch()}>Retry</Button>}>
                    <AlertTitle>Connection Failed</AlertTitle>
                    Could not fetch Ingress Stats. The service may be unavailable.
                </Alert>
            )}

            <Box>
                <Typography variant="h6" fontWeight="bold">Ingress Gateway</Typography>
                <Typography variant="body2" color="text.secondary">
                    Real-time monitoring of message ingestion and deduplication.
                </Typography>
            </Box>

            {/* KPI Cards */}
            <Grid container spacing={3}>
                <MetricCard 
                    title="Total Messages" 
                    value={total.toLocaleString()} 
                    icon={<Inbox color="#3b82f6" />} // Blue
                    color="#3b82f6"
                    loading={isLoading && !stats}
                />
                <MetricCard 
                    title="Invalid Format" 
                    value={invalid.toLocaleString()} 
                    icon={<AlertTriangle color="#ef4444" />} // Red
                    color="#ef4444"
                    alert={invalid > 0}
                    loading={isLoading && !stats}
                />
                 <MetricCard 
                    title="Deduped" 
                    value={deduped.toLocaleString()} 
                    subValue={`${dedupeRate}% Rate`}
                    icon={<Filter color="#10b981" />} // Emerald
                    color="#10b981"
                    loading={isLoading && !stats}
                />
                <Grid item xs={12} sm={6} lg={3}>
                    <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
                        <CardContent>
                             <Stack spacing={1}>
                                <Stack direction="row" alignItems="center" spacing={1} color="text.secondary" mb={1}>
                                    <Clock size={16} />
                                    <Typography variant="caption" fontWeight="bold" sx={{ letterSpacing: 1 }}>LAST MESSAGE</Typography>
                                </Stack>
                                <Typography variant="h6" fontWeight="medium">
                                    {stats?.lastMessageAt ? new Date(stats.lastMessageAt).toLocaleTimeString() : (isLoading ? '...' : 'Never')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {stats?.lastMessageAt ? new Date(stats.lastMessageAt).toLocaleDateString() : '-'}
                                </Typography>
                             </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts & Tools */}
            <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                    <Card sx={{ height: 400 }}>
                        <CardContent sx={{ height: '100%' }}>
                            <Typography variant="subtitle1" fontWeight="bold" mb={2}>Traffic Session Trend</Typography>
                            {!hasTraffic && !isLoading && !isError && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    ยังไม่มี message เข้ามาที่ Ingress Gateway (stats ยังเป็น 0 ทั้งหมด) — ต้อง publish MQTT message ก่อน
                                    และต้อง seed allowlist ให้ device/station ด้วย
                                    (แนะนำรัน `edge-layer/scripts/edge-smoke-mqtt.ps1 -Up` หรือ `edge-layer/scripts/edge-smoke-mqtt.sh --up`)
                                </Alert>
                            )}
                            <ResponsiveContainer width="100%" height="90%">
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tick={{ dy: 5 }} />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <ChartTooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: 8 }}
                                        itemStyle={{ color: '#f1f5f9' }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Total Messages" />
                                    <Line type="monotone" dataKey="deduped" stroke="#10b981" strokeWidth={2} dot={false} name="Deduped" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} lg={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                <Terminal size={20} />
                                <Typography variant="subtitle1" fontWeight="bold">CLI Debugging</Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Use this command to verify raw JSON stats from the service directly.
                            </Typography>
                            
                            <Box sx={{ 
                                bgcolor: '#0f172a', 
                                p: 2, 
                                borderRadius: 1, 
                                fontFamily: 'monospace', 
                                fontSize: '0.75rem',
                                color: 'success.light',
                                overflowX: 'auto',
                                mb: 3,
                                border: '1px solid #1e293b'
                            }}>
                                curl -X GET "{getServiceUrl('EDGE_INGRESS_GATEWAY')}/api/v1/ingress/stats" ...
                            </Box>

                            <Button 
                                variant="outlined" 
                                startIcon={<Copy size={16} />} 
                                fullWidth
                                onClick={handleCopyCurl}
                            >
                                Copy Curl Command
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Stack>
    );
}
