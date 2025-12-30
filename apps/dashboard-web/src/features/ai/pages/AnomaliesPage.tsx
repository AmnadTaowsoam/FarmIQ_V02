import React, { useEffect, useState, useMemo } from 'react';
import { Box, Button, Chip, Grid, Typography, Card, CardContent, IconButton, Tooltip, useTheme, alpha } from '@mui/material';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Info, Clock } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { BasicTable, Column } from '../../../components/tables/BasicTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { api } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import type { components } from '@farmiq/api-client';

type Anomaly = components['schemas']['Anomaly'];

export const AnomaliesPage: React.FC = () => {
  const theme = useTheme();
  const { tenantId, farmId, barnId, timeRange } = useActiveContext();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  // Temporary Mock Data
  const MOCK_ANOMALIES: Anomaly[] = [
    {
      anomaly_id: '1',
      type: 'Temperature Spike',
      severity: 'critical',
      message: 'Sudden increase in barn temperature (Barn A, Zone 2).',
      status: 'new',
      occurred_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
      device_id: 'dev-001',
      tenant_id: tenantId || 'mock-tenant',
      farm_id: farmId,
      barn_id: barnId
    },
    {
      anomaly_id: '2',
      type: 'Feed Intake Drop',
      severity: 'high',
      message: 'Significant reduction in daily feed consumption detected.',
      status: 'new',
      occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
      device_id: 'dev-002',
      tenant_id: tenantId || 'mock-tenant',
      farm_id: farmId,
      barn_id: barnId
    },
    {
      anomaly_id: '3',
      type: 'Water Leak Suspected',
      severity: 'medium',
      message: 'Water usage flow rate exceeds normal baseline by 25%.',
      status: 'new',
      occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
      device_id: 'dev-003',
      tenant_id: tenantId || 'mock-tenant',
      farm_id: farmId,
      barn_id: barnId
    }
  ];

  const fetchAnomalies = async () => {
    // Simulate API call
    setLoading(true);
    // Reset any previous errors or unavailable states
    setApiUnavailable(false);
    setError(null);
    
    setTimeout(() => {
       setAnomalies(MOCK_ANOMALIES);
       setLoading(false);
    }, 800);
  };

  useEffect(() => {
    fetchAnomalies();
  }, [tenantId, farmId, barnId, timeRange.start, timeRange.end]);

  const handleAcknowledge = async (anomalyId?: string) => {
    if (!anomalyId) return;
    try {
      await api.analyticsAnomaliesAcknowledge({ anomalyId }, { notes: 'Reviewed from dashboard' });
      fetchAnomalies();
    } catch (err) {
      console.error('Failed to acknowledge anomaly', err);
    }
  };

  const stats = useMemo(() => {
    return {
      total: anomalies.length,
      critical: anomalies.filter(a => a.severity === 'critical').length,
      high: anomalies.filter(a => a.severity === 'high').length,
      medium: anomalies.filter(a => a.severity === 'medium').length,
      new: anomalies.filter(a => a.status === 'new' || a.status === 'open').length,
    };
  }, [anomalies]);

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return theme.palette.error.main;
      case 'high': return theme.palette.warning.main;
      case 'medium': return theme.palette.info.main;
      default: return theme.palette.text.secondary;
    }
  };

  const columns: Column<Anomaly>[] = [
    { 
      id: 'severity', 
      label: 'Severity',
      width: '120px',
      format: (value) => (
         <Chip 
            label={(value as string)?.toUpperCase()} 
            size="small"
            sx={{ 
               fontWeight: 700,
               bgcolor: alpha(getSeverityColor(value as string), 0.1),
               color: getSeverityColor(value as string),
               borderColor: alpha(getSeverityColor(value as string), 0.2),
               border: '1px solid'
            }} 
         />
      )
    },
    { 
      id: 'type', 
      label: 'Type',
      format: (value) => (
         <Typography variant="body2" fontWeight={600}>{value}</Typography>
      )
    },
    { id: 'message', label: 'Message' },
    {
      id: 'occurred_at',
      label: 'Occurred',
      format: (value) => {
         const date = value ? new Date(value) : new Date();
         return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
               <Clock size={14} color={theme.palette.text.secondary} />
               <Tooltip title={date.toLocaleString()}>
                  <Typography variant="body2">{date.toLocaleDateString()}</Typography>
               </Tooltip>
            </Box>
         );
      }
    },
    { 
      id: 'status', 
      label: 'Status',
      format: (value) => {
         const isAcknowledged = value === 'acknowledged';
         return (
            <Chip 
               label={(value as string)?.replace('_', ' ')} 
               size="small" 
               variant={isAcknowledged ? 'outlined' : 'filled'}
               color={isAcknowledged ? 'default' : 'primary'}
            />
         );
      }
    },
    {
      id: 'anomaly_id', // Virtual ID for actions column
      label: 'Actions',
      format: (_value, row) => (
        <Button
          size="small"
          variant={row.status === 'acknowledged' ? 'text' : 'contained'}
          color={row.status === 'acknowledged' ? 'inherit' : 'primary'}
          disabled={row.status === 'acknowledged'}
          onClick={(event) => {
            event.stopPropagation();
            handleAcknowledge(row.anomaly_id);
          }}
          startIcon={row.status === 'acknowledged' ? <CheckCircle size={14} /> : undefined}
        >
          {row.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}
        </Button>
      ),
    },
  ];

  if (error) return <ErrorState title="Failed to load anomalies" message={error.message} onRetry={fetchAnomalies} />;

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out', pb: 4 }}>
      <PageHeader 
         title="Anomalies & Early Warning" 
         subtitle="AI-detected anomalies requiring attention"
         action={
            <Button startIcon={<RefreshCw size={18} />} onClick={fetchAnomalies} variant="outlined" size="small">
               Refresh
            </Button>
         }
      />

      {apiUnavailable ? (
        <EmptyState
          title="Anomalies not available"
          description="This environment doesn't have the anomalies API enabled yet."
          variant="api-unavailable"
          actionLabel="Retry"
          onAction={fetchAnomalies}
        />
      ) : (
         <>
            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3, mt: 1 }}>
               <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                     <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>CRITICAL</Typography>
                        <Typography variant="h4" color="error.main" fontWeight={800}>{loading ? '-' : stats.critical}</Typography>
                     </CardContent>
                  </Card>
               </Grid>
               <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                     <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>HIGH SEVERITY</Typography>
                        <Typography variant="h4" color="warning.main" fontWeight={800}>{loading ? '-' : stats.high}</Typography>
                     </CardContent>
                  </Card>
               </Grid>
               <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                     <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>NEW ISSUES</Typography>
                        <Typography variant="h4" color="primary.main" fontWeight={800}>{loading ? '-' : stats.new}</Typography>
                     </CardContent>
                  </Card>
               </Grid>
               <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                     <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>TOTAL</Typography>
                        <Typography variant="h4" fontWeight={800}>{loading ? '-' : stats.total}</Typography>
                     </CardContent>
                  </Card>
               </Grid>
            </Grid>

            {loading && anomalies.length === 0 ? (
               <LoadingCard title="Loading anomalies..." lines={4} />
            ) : anomalies.length === 0 ? (
               <EmptyState
                  title="No anomalies detected"
                  description="No anomalies found for the selected context."
                  actionLabel="Refresh"
                  onAction={fetchAnomalies}
               />
            ) : (
               <PremiumCard noPadding title="Anomaly List">
                  <BasicTable 
                     columns={columns} 
                     data={anomalies} 
                     loading={loading} 
                     rowKey="anomaly_id" 
                     emptyMessage="No anomalies found matching criteria"
                  />
               </PremiumCard>
            )}
         </>
      )}
    </Box>
  );
};
