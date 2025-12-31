import { useEffect, useMemo, useState } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  Stack,
  Skeleton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { Activity, Server, Database, Wifi } from 'lucide-react';

import { useSettings } from '@/contexts/SettingsContext';
import { edgeOpsApi, TelemetryMetrics, TelemetryReadingsResponse } from '@/api/client';
import { usePoll } from '@/hooks/usePoll';
import { MetricCard } from '@/components/ui/MetricCard';


const MAX_SPARK_POINTS = 20;

export function DashboardPage() {
  const { refreshInterval, lastRefresh, tenantId, apiKey, getServiceUrl } = useSettings();
  
  // Use smart polling hook which handles visibility
  const { data: edgeStatus, isLoading: loadingStatus, isError: errorStatus, error: edgeError } = usePoll(
    ['edge-status', lastRefresh, tenantId], 
    () => edgeOpsApi.getStatus({ tenantId, apiKey, getServiceUrl }),
    refreshInterval
  );

  const { data: telemetryMetrics, isLoading: loadingTelemetry, isError: errorTelemetry, error: telemetryError } = usePoll<TelemetryMetrics>(
    ['telemetry-metrics', lastRefresh, tenantId],
    () => edgeOpsApi.getTelemetryMetrics({ tenantId, apiKey, getServiceUrl }),
    Math.max(refreshInterval, 5000)
  );

  const { data: telemetryReadings, isLoading: loadingReadings, isError: errorReadings, error: readingsError } = usePoll<TelemetryReadingsResponse>(
    ['telemetry-readings', lastRefresh, tenantId],
    () => edgeOpsApi.getTelemetryReadings({ limit: 10 }, { tenantId, apiKey, getServiceUrl }),
    Math.max(refreshInterval * 3, 15000)
  );

  const safeEdgeStatus = edgeStatus ?? {
    health: { status: 'error' as const, uptime: 0, version: 'unknown' },
    resources: { cpuUsage: 0, memoryUsage: 0, diskUsage: { path: '/data', usedPercent: 0, freeGb: 0 } },
    services: [],
    sync: { pendingCount: 0, oldestPendingAgeMs: 0, dlqCount: 0 }
  };

  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);
  const [ingestRateHistory, setIngestRateHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!edgeStatus) return;
    setCpuHistory(prev => [...prev, edgeStatus.resources.cpuUsage].slice(-MAX_SPARK_POINTS));
    setMemHistory(prev => [...prev, edgeStatus.resources.memoryUsage].slice(-MAX_SPARK_POINTS));
  }, [edgeStatus]);

  useEffect(() => {
    if (!telemetryMetrics) return;
    setIngestRateHistory(prev => [...prev, telemetryMetrics.ingestionRatePerMinute].slice(-MAX_SPARK_POINTS));
  }, [telemetryMetrics]);

  const cpuChartData = useMemo(() => cpuHistory.map((value, idx) => ({ time: idx, value })), [cpuHistory]);
  const memChartData = useMemo(() => memHistory.map((value, idx) => ({ time: idx, value })), [memHistory]);
  const ingestChartData = useMemo(() => ingestRateHistory.map((value, idx) => ({ time: idx, value })), [ingestRateHistory]);

  if (loadingStatus && !edgeStatus) {
    return (
        <Grid container spacing={3}>
            {[1, 2, 3, 4].map(i => (
                <Grid item xs={12} sm={6} lg={3} key={i}>
                    <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
                </Grid>
            ))}
        </Grid>
    );
  }

  return (
    <Stack spacing={4}>
      {/* Error Banner */}
      {errorStatus && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          เชื่อมต่อ `edge-observability-agent` ไม่ได้ ({String(edgeError)})
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3}>
        <MetricCard 
          title="CPU Usage" 
          value={`${safeEdgeStatus.resources.cpuUsage.toFixed(1)}%`} 
          icon={<Activity color="#60a5fa" />} // Blue
          chartData={cpuChartData}
          color="#60a5fa" 
          loading={loadingStatus && !edgeStatus}
        />
        <MetricCard 
          title="Memory Usage" 
          value={`${safeEdgeStatus.resources.memoryUsage.toFixed(1)}%`} 
          icon={<Server color="#c084fc" />} // Purple
          chartData={memChartData}
          color="#c084fc"
          loading={loadingStatus && !edgeStatus}
        />
        <MetricCard 
          title="Disk Usage" 
          value={`${safeEdgeStatus.resources.diskUsage.usedPercent.toFixed(1)}%`} 
          subValue={`${safeEdgeStatus.resources.diskUsage.freeGb} GB Free`}
          icon={<Database color="#fbbf24" />} // Amber
          color="#fbbf24" 
          loading={loadingStatus && !edgeStatus}
        />
        <MetricCard 
          title="Sync Backlog" 
          value={safeEdgeStatus.sync.pendingCount.toString()} 
          subValue={safeEdgeStatus.sync.dlqCount > 0 ? `${safeEdgeStatus.sync.dlqCount} in DLQ` : 'Sync Healthy'}
          icon={<Wifi color={safeEdgeStatus.sync.dlqCount > 0 ? "#ef4444" : "#22d3ee"} />} 
          color={safeEdgeStatus.sync.dlqCount > 0 ? "#ef4444" : "#22d3ee"}
          alert={safeEdgeStatus.sync.dlqCount > 0}
          loading={loadingStatus && !edgeStatus}
        />
      </Grid>

      {/* Telemetry (DB-backed) */}
      <Box>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Telemetry (DB)</Typography>
        {(errorTelemetry || errorReadings) && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            โหลดข้อมูล telemetry ไม่สำเร็จ ({String(telemetryError || readingsError)})
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mb: 2 }}>
          <MetricCard
            title="Total Readings"
            value={(telemetryMetrics?.totalReadings ?? 0).toLocaleString()}
            subValue={`Tenant: ${tenantId}`}
            icon={<Database color="#10b981" />}
            color="#10b981"
            lg={4}
            chartData={ingestChartData}
            loading={loadingTelemetry && !telemetryMetrics}
          />
          <MetricCard
            title="Ingestion / min"
            value={(telemetryMetrics?.ingestionRatePerMinute ?? 0).toLocaleString()}
            subValue={`Aggregates: ${(telemetryMetrics?.totalAggregates ?? 0).toLocaleString()}`}
            icon={<Activity color="#3b82f6" />}
            color="#3b82f6"
            lg={4}
            chartData={ingestChartData}
            loading={loadingTelemetry && !telemetryMetrics}
          />
        </Grid>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Latest Readings
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>occurred_at</TableCell>
                    <TableCell>device_id</TableCell>
                    <TableCell>metric</TableCell>
                    <TableCell align="right">value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(telemetryReadings?.readings ?? []).map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {new Date(r.occurred_at).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.device_id}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {r.metric_type}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {r.metric_value}{r.unit ? ` ${r.unit}` : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loadingReadings && (telemetryReadings?.readings?.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ color: 'text.secondary' }}>
                        No readings found for tenant `{tenantId}`
                      </TableCell>
                    </TableRow>
                  )}
                  {loadingReadings && !telemetryReadings && (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ color: 'text.secondary' }}>
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      {/* Service Health */}
      <Box>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Service Status</Typography>
        <Grid container spacing={2}>
            {safeEdgeStatus.services.map((svc) => (
                <Grid item xs={12} md={6} lg={4} key={svc.name}>
                    <ServiceCard service={svc} />
                </Grid>
            ))}
        </Grid>
      </Box>
    </Stack>
  );
}



function ServiceCard({ service }: { service: any }) {
    const isUp = service.status === 'up';
    return (
        <Card variant="outlined" sx={{ '&:hover': { borderColor: 'primary.main', transition: 'border-color 0.2s' } }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box sx={{ position: 'relative', display: 'flex' }}>
                             {/* Pulse Effect */}
                             <Box sx={{
                                 position: 'absolute',
                                 width: 12, height: 12,
                                 borderRadius: '50%',
                                 bgcolor: isUp ? 'success.main' : 'error.main',
                                 opacity: 0.75,
                                 animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                                 '@keyframes ping': {
                                     '75%, 100%': { transform: 'scale(2)', opacity: 0 }
                                 }
                             }} />
                             <Box sx={{
                                 width: 12, height: 12,
                                 borderRadius: '50%',
                                 bgcolor: isUp ? 'success.main' : 'error.main',
                                 zIndex: 1
                             }} />
                        </Box>
                        <Typography variant="subtitle1" fontWeight="500">
                            {service.name}
                        </Typography>
                    </Stack>
                    
                    <Stack direction="row" alignItems="center" spacing={1}>
                        {service.latencyMs && (
                             <Chip label={`${service.latencyMs}ms`} size="small" variant="outlined" sx={{ fontFamily: 'monospace', height: 20, fontSize: '0.7rem' }} />
                        )}
                        <Chip 
                            label={service.status} 
                            color={isUp ? 'success' : 'error'} 
                            size="small" 
                            sx={{ fontWeight: 'bold', textTransform: 'uppercase', height: 24 }} 
                        />
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
}

