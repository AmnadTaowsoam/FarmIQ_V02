import { useState } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  Stack,
  Skeleton,
  Alert
} from '@mui/material';
import { Activity, Server, Database, Wifi } from 'lucide-react';

import { useSettings } from '@/contexts/SettingsContext';
import { edgeOpsApi, MOCK_EDGE_STATUS } from '@/api/client';
import { usePoll } from '@/hooks/usePoll';
import { MetricCard } from '@/components/ui/MetricCard';


// Mock Chart Data Generator
const generateChartData = () => {
  return Array.from({ length: 20 }, (_, i) => ({
    time: i,
    value: Math.floor(Math.random() * 40) + 10
  }));
};

export function DashboardPage() {
  const { refreshInterval, lastRefresh, tenantId, apiKey, getServiceUrl } = useSettings();
  
  // Use smart polling hook which handles visibility
  const { data, isLoading, isError, error } = usePoll(
    ['edge-status', lastRefresh, tenantId], 
    () => edgeOpsApi.getStatus({ tenantId, apiKey, getServiceUrl }),
    refreshInterval
  );

  const status = isError ? MOCK_EDGE_STATUS : (data || MOCK_EDGE_STATUS); // Use mock on error for dev proof
  const [chartData] = useState(generateChartData()); // Static mock data for charts

  if (isLoading && !data) {
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
      {isError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Failed to connect to Edge Agent. Showing Mock Data. ({String(error)})
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3}>
        <MetricCard 
          title="CPU Usage" 
          value={`${status.resources.cpuUsage.toFixed(1)}%`} 
          icon={<Activity color="#60a5fa" />} // Blue
          chartData={chartData}
          color="#60a5fa" 
        />
        <MetricCard 
          title="Memory Usage" 
          value={`${status.resources.memoryUsage.toFixed(1)}%`} 
          icon={<Server color="#c084fc" />} // Purple
          chartData={chartData}
          color="#c084fc"
        />
        <MetricCard 
          title="Disk Usage" 
          value={`${status.resources.diskUsage.usedPercent.toFixed(1)}%`} 
          subValue={`${status.resources.diskUsage.freeGb} GB Free`}
          icon={<Database color="#fbbf24" />} // Amber
          color="#fbbf24" 
        />
        <MetricCard 
          title="Sync Backlog" 
          value={status.sync.pendingCount.toString()} 
          subValue={status.sync.dlqCount > 0 ? `${status.sync.dlqCount} in DLQ` : 'Sync Healthy'}
          icon={<Wifi color={status.sync.dlqCount > 0 ? "#ef4444" : "#22d3ee"} />} 
          color={status.sync.dlqCount > 0 ? "#ef4444" : "#22d3ee"}
          alert={status.sync.dlqCount > 0}
        />
      </Grid>

      {/* Service Health */}
      <Box>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Service Status</Typography>
        <Grid container spacing={2}>
            {status.services.map((svc) => (
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

