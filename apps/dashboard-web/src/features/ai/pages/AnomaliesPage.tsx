import React, { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
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
  const { tenantId, farmId, barnId, timeRange } = useActiveContext();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnomalies = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await api.analyticsAnomaliesList({
        tenant_id: tenantId,
        farm_id: farmId || undefined,
        barn_id: barnId || undefined,
        start_time: timeRange.start.toISOString(),
        end_time: timeRange.end.toISOString(),
        page: 1,
        limit: 100,
      });
      setAnomalies(response.data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
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

  const columns: Column<Anomaly>[] = [
    { id: 'anomaly_id', label: 'Anomaly ID' },
    { id: 'type', label: 'Type' },
    { id: 'severity', label: 'Severity' },
    { id: 'message', label: 'Message' },
    {
      id: 'occurred_at',
      label: 'Occurred',
      format: (value) => value ? new Date(value).toLocaleString() : '—',
    },
    { id: 'status', label: 'Status' },
    {
      id: 'acknowledged_at',
      label: 'Actions',
      format: (_value, row) => (
        <Button
          size="small"
          variant="outlined"
          disabled={row.status === 'acknowledged'}
          onClick={(event) => {
            event.stopPropagation();
            handleAcknowledge(row.anomaly_id);
          }}
        >
          Acknowledge
        </Button>
      ),
    },
  ];

  if (error) return <ErrorState title="Failed to load anomalies" message={error.message} onRetry={fetchAnomalies} />;
  if (loading && anomalies.length === 0) {
    return (
      <Box>
        <PageHeader title="Anomalies & Early Warning" subtitle="AI-detected anomalies that require attention" />
        <LoadingCard title="Loading anomalies" lines={4} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title="Anomalies & Early Warning" subtitle="AI-detected anomalies that require attention" />
      {anomalies.length === 0 ? (
        <EmptyState title="No anomalies detected" description="No anomalies found for the selected context." />
      ) : (
        <PremiumCard noPadding>
          <BasicTable columns={columns} data={anomalies} loading={loading} rowKey="anomaly_id" />
        </PremiumCard>
      )}
    </Box>
  );
};
